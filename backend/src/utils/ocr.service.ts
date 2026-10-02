import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { Workbook } from 'exceljs';
import mammoth from 'mammoth';
const Ocr = require('@gutenye/ocr-node').default;
const sharp = require('sharp');
const { execSync } = require('child_process');
const os = require('os');

// OCR service using PaddleOCR via @gutenye/ocr-node
interface OcrInstance {
  detect(image: string | { data: Uint8Array | Uint8ClampedArray; width: number; height: number }): Promise<any>;
}

let ocrInstance: OcrInstance | null = null;

// Initialize OCR instance lazily
async function getOcrInstance(): Promise<OcrInstance> {
  if (!ocrInstance) {
    ocrInstance = await Ocr.create({
      // Using English models - can be configured as needed
      // Models will be downloaded automatically on first use
    });
  }
  return ocrInstance!; // Non-null assertion operator
}

/**
 * Check if extracted text is sufficient (not just whitespace or very short)
 */
export async function isTextSufficient(text: string): Promise<boolean> {
  if (!text || typeof text !== 'string') return false;
  const cleanedText = text.trim();
  return cleanedText.length >= 50; // Minimum 50 characters
}

/**
 * Check if image buffer is blank (mostly white or black with low variance)
 */
async function isImageBlank(imageBuffer: Buffer): Promise<boolean> {
  try {
    const { width, height, data } = await sharp(imageBuffer)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const length = data.length;
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += data[i];
    }
    const mean = sum / length;

    // If the image is almost entirely white or black with low variance, consider blank
    if ((mean > 250 && mean <= 255) || (mean >= 0 && mean < 5)) {
      // Now compute variance to be sure
      let variance = 0;
      for (let i = 0; i < length; i++) {
        const diff = data[i] - mean;
        variance += diff * diff;
      }
      variance /= length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 10) { // low variance
        return true;
      }
    }
    return false;
  } catch (error: any) {
    console.warn('Error checking if image is blank:', error);
    // If we cannot determine, assume not blank to avoid falling back unnecessarily
    return false;
  }
}

/**
 * Rasterize a PDF page using Poppler's pdftocairo
 * Returns PNG image buffer or null if failed
 */
async function rasterizePdfPageWithPoppler(pdfBuffer: Buffer, pageNumber: number): Promise<Buffer | null> {
  let tempPdfPath = '';
  let tempImgPath = '';
  try {
    // Create temporary files
    tempPdfPath = `/tmp/temp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.pdf`;
    const tempImgPrefix = `/tmp/temp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Write PDF buffer to temp file
    await fs.promises.writeFile(tempPdfPath, pdfBuffer);

    // Run pdftocairo to convert page to PNG
    // We'll convert only the specified page
    // pdftocairo -png -singlefile -f <page> -l <page> <pdf> <prefix>
    // Output will be <prefix>.png (with -singlefile)
    const command = `pdftocairo -png -singlefile -f ${pageNumber} -l ${pageNumber} "${tempPdfPath}" "${tempImgPrefix}"`;
    execSync(command, { stdio: 'ignore' });

    // Read the generated PNG
    tempImgPath = `${tempImgPrefix}.png`;
    const imgBuffer = await fs.promises.readFile(tempImgPath);

    // Clean up temporary files
    await fs.promises.unlink(tempPdfPath);
    await fs.promises.unlink(tempImgPath);

    return imgBuffer;
  } catch (error: any) {
    console.warn('Poppler rasterization failed:', error.message);
    // Clean up any temporary files that might have been created
    try {
      if (tempPdfPath) await fs.promises.unlink(tempPdfPath);
    } catch (_) {}
    try {
      if (tempImgPath) await fs.promises.unlink(tempImgPath);
    } catch (_) {}
    return null;
  }
}

/**
 * Perform OCR on PDF data with intelligent fallback
 * 1. Attempts native text extraction first
 * 2. Only uses OCR for pages with insufficient text
 * 3. Returns structured results with text, confidence, bounding boxes
 */
export async function ocrPDF(buffer: Buffer): Promise<{
  text: string;
  pages: Array<{
    pageNumber: number;
    source: 'native' | 'ocr';
    text: string;
    confidence?: number;
    blocks?: Array<{
      text: string;
      confidence: number;
      bbox: [number, number, number, number]; // [x1, y1, x2, y2]
      lineIndex?: number;
      wordIndex?: number;
    }>;
  }>;
}> {
  // First try regular PDF text extraction
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const regularText = result.text;

    // If we got sufficient text, return native extraction
    if (await isTextSufficient(regularText)) {
      return {
        text: regularText,
        pages: [{
          pageNumber: 1,
          source: 'native',
          text: regularText
        }]
      };
    }
  } catch (error) {
    // Native extraction failed, we'll try OCR
    console.warn('Regular PDF parsing failed, trying OCR:', error);
  }

  // If regular extraction failed or returned insufficient text, use OCR
  const ocr = await getOcrInstance();

  // Load PDF using pdfjs-dist legacy build for Node.js canvas compatibility
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
  const { Canvas: CanvasClass, Image: ImageClass } = require('canvas');

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const pages: Array<{
    pageNumber: number;
    source: 'native' | 'ocr';
    text: string;
    confidence?: number;
    blocks?: Array<{
      text: string;
      confidence: number;
      bbox: [number, number, number, number];
      lineIndex?: number;
      wordIndex?: number;
    }>;
  }> = [];

  let fullText = '';

  // Process each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    let usePoppler = false;
    let imageBuffer: Buffer | null = null;
    let viewport: any;
    const page = await pdf.getPage(pageNum);

    // Try native text extraction for this page
    let nativePageText = '';
    let isSufficient = false;

    try {
      const parser = new PDFParse({ data: buffer });
      // NOTE: PDFParse doesn't support page-specific extraction easily
      // We'll extract all text and then try to associate with pages
      // For now, we'll use OCR for all pages if any page needs it
      // A more sophisticated approach would be to render each page and check text density
      const result = await parser.getText();
      nativePageText = result.text;
      isSufficient = await isTextSufficient(nativePageText);
    } catch (error) {
      // Page-level native extraction failed
      isSufficient = false;
    }

    if (isSufficient) {
      // Use native text for this page
      pages.push({
        pageNumber: pageNum,
        source: 'native',
        text: nativePageText
      });
      fullText += nativePageText + '\n\n';
    } else {
      // Use OCR for this page
      // Try Poppler rasterization first
      imageBuffer = await rasterizePdfPageWithPoppler(buffer, pageNum);
      usePoppler = false;

      if (imageBuffer !== null) {
        // Check if the image is blank
        const blank = await isImageBlank(imageBuffer);
        if (!blank) {
          usePoppler = true;
        } else {
          console.warn(`Poppler rasterization produced blank image for page ${pageNum}, falling back to pdfjs-dist`);
        }
      } else {
        console.warn(`Poppler rasterization failed for page ${pageNum}, falling back to pdfjs-dist`);
      }

      let canvasContext: any;
      let viewport: any;
      let canvas: any;

      if (!usePoppler) {
        // Fallback to pdfjs-dist + canvas
        viewport = page.getViewport({ scale: 2.0 }); // Scale for better OCR accuracy
        const { Canvas: CanvasClass, Image: ImageClass } = await import('canvas');

        // Create canvas with pdfjs-dist compatibility layer
        const { canvas: canvasObj, context } = (() => {
          // Save original drawImage
          const tempCanvas = new CanvasClass(1, 1);
          const tempContext = tempCanvas.getContext('2d');
          const originalDrawImage = tempContext.drawImage;

          // Create canvas
          const canvas = new CanvasClass(viewport.width, viewport.height);
          const context = canvas.getContext('2d');

          // Wrap drawImage to handle pdfjs-dist CanvasElement objects
          context.drawImage = function(...args: any[]) {
            // Handle all versions of drawImage where the first arg might be a CanvasElement
            // Version 1: drawImage(image, dx, dy) - 3 args
            // Version 2: drawImage(image, dx, dy, dw, dh) - 5 args
            // Version 3: drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh) - 9 args

            if (args.length >= 3 && args[0] && typeof args[0] === 'object') {
              const firstArg = args[0];
              // Check if it looks like a pdfjs-dist CanvasElement by checking for width, height, and getContext
              const width = firstArg.width;
              const height = firstArg.height;
              const hasWidthHeight = (width !== undefined && width !== null) || (height !== undefined && height !== null);
              const hasGetContext = firstArg.getContext && typeof firstArg.getContext === 'function';

              if (hasWidthHeight && hasGetContext) {
                // This appears to be a pdfjs-dist CanvasElement
                // We need to convert it to a proper canvas that our context can use

                try {
                  // Create a proper canvas from our canvas module
                  const properCanvas = new CanvasClass(width, height);
                  const properContext = properCanvas.getContext('2d');

                  // Get the context from the pdfjs-dist CanvasElement
                  const pdfjsContext = firstArg.getContext('2d');

                  // Copy the image data from the pdfjs-dist canvas to our canvas
                  // We need to extract the raw pixel data and create a new ImageData in our context
                  const imageData = pdfjsContext.getImageData(0, 0, width, height);
                  const newImageData = properContext.createImageData(width, height);
                  newImageData.data.set(imageData.data);

                  // Now put our new ImageData into our context
                  properContext.putImageData(newImageData, 0, 0);

                  // Now draw our proper canvas instead
                  args[0] = properCanvas;
                  // console.log('Converted CanvasElement for drawImage (', width, 'x', height, ')');
                } catch (convertError: any) {
                  // Silently handle conversion errors and let the original error happen
                  // console.error('Error converting pdfjs-dist CanvasElement:', convertError.message);
                }
              }
            }

            try {
              return (originalDrawImage as any).apply(this, args);
            } catch (e) {
              // console.error('Error in drawImage:', e.message);
              throw e;
            }
          };

          return { canvas, context };
        })();

        canvas = canvasObj;
        canvasContext = context;
      } else {
        // We have imageBuffer from Poppler, we need to create a canvas from it for consistency with the rest of the OCR code?
        // Actually, the OCR function expects to run OCR on an image file. We already have the image buffer from Poppler.
        // We can directly run OCR on that buffer after preprocessing.
        // But note: the OCR service's ocrImage function expects a buffer and does preprocessing.
        // We can use that.
        // However, the code below expects a canvas and context to render the page? No, we are not rendering if we use Poppler.
        // We have the image buffer, so we can skip the rendering step and go straight to OCR.
        // We'll set a flag to indicate we have an image buffer from Poppler.
        // We'll restructure: if we have imageBuffer from Poppler (and it's not blank), we'll use that for OCR.
        // Otherwise, we do the pdfjs-dist rendering.
        // Let's adjust the flow.

        // We'll move the OCR running part outside the if/else.
        // We'll have a variable `ocrImageBuffer` that will be either the Poppler buffer (if good) or the rendered canvas buffer.
        // We'll do the rendering only if we don't have a good Poppler buffer.
      }
    }

    // At this point, we need to have an image buffer to run OCR on.
    // If we used Poppler and it was good, we have imageBuffer from Poppler.
    // If we fell back to pdfjs-dist, we need to render the page to a canvas and get its buffer.
    let ocrImageBuffer: Buffer;
    if (usePoppler && imageBuffer !== null) {
      ocrImageBuffer = imageBuffer;
    } else {
      // Render using pdfjs-dist + canvas (we already have canvas, context, viewport from the fallback branch)
      // Actually, we need to render the page.
      // We'll redo the rendering here for clarity.
      viewport = page.getViewport({ scale: 2.0 });
      const { Canvas: CanvasClass, Image: ImageClass } = await import('canvas');

      // Create canvas with pdfjs-dist compatibility layer
      const { canvas, context } = (() => {
        // Save original drawImage
        const tempCanvas = new CanvasClass(1, 1);
        const tempContext = tempCanvas.getContext('2d');
        const originalDrawImage = tempContext.drawImage;

        // Create canvas
        const canvas = new CanvasClass(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        // Wrap drawImage to handle pdfjs-dist CanvasElement objects
        context.drawImage = function(...args: any[]) {
          // Handle all versions of drawImage where the first arg might be a CanvasElement
          // Version 1: drawImage(image, dx, dy) - 3 args
          // Version 2: drawImage(image, dx, dy, dw, dh) - 5 args
          // Version 3: drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh) - 9 args

          if (args.length >= 3 && args[0] && typeof args[0] === 'object') {
            const firstArg = args[0];
            // Check if it looks like a pdfjs-dist CanvasElement by checking for width, height, and getContext
            const width = firstArg.width;
            const height = firstArg.height;
            const hasWidthHeight = (width !== undefined && width !== null) || (height !== undefined && height !== null);
            const hasGetContext = firstArg.getContext && typeof firstArg.getContext === 'function';

            if (hasWidthHeight && hasGetContext) {
              // This appears to be a pdfjs-dist CanvasElement
              // We need to convert it to a proper canvas that our context can use

              try {
                // Create a proper canvas from our canvas module
                const properCanvas = new CanvasClass(width, height);
                const properContext = properCanvas.getContext('2d');

                // Get the context from the pdfjs-dist CanvasElement
                const pdfjsContext = firstArg.getContext('2d');

                // Copy the image data from the pdfjs-dist canvas to our canvas
                // We need to extract the raw pixel data and create a new ImageData in our context
                const imageData = pdfjsContext.getImageData(0, 0, width, height);
                const newImageData = properContext.createImageData(width, height);
                newImageData.data.set(imageData.data);

                // Now put our new ImageData into our context
                properContext.putImageData(newImageData, 0, 0);

                // Now draw our proper canvas instead
                args[0] = properCanvas;
                // console.log('Converted CanvasElement for drawImage (', width, 'x', height, ')');
              } catch (convertError: any) {
                // Silently handle conversion errors and let the original error happen
                // console.error('Error converting pdfjs-dist CanvasElement:', convertError.message);
              }
            }
          }

          try {
            return (originalDrawImage as any).apply(this, args);
          } catch (e) {
            // console.error('Error in drawImage:', e.message);
            throw e;
          }
        };

        return { canvas, context };
      })();

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Extract image data as buffer
      ocrImageBuffer = await canvas.toBuffer('image/png');
    }

    // Save raw image for debugging
    await new Promise<void>((resolve, reject) => {
      fs.writeFile(`/tmp/debug-raw-image-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`, ocrImageBuffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Optional: Preprocess image for better OCR results
    const processedImageBuffer = await preprocessImage(ocrImageBuffer);

    // Save processed image for debugging
    await new Promise<void>((resolve, reject) => {
      fs.writeFile(`/tmp/debug-processed-image-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`, processedImageBuffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Save processed image to temporary file for OCR (since @gutenye/ocr-node expects file paths)
    const tempFilePath = `/tmp/ocr-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`;
    await new Promise<void>((resolve, reject) => {
      fs.writeFile(tempFilePath, processedImageBuffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Run PaddleOCR on the image file
    const ocrResult = await ocr.detect(tempFilePath);
    console.log('OCR raw result:', JSON.stringify(ocrResult, null, 2));

    // Clean up temporary file
    await new Promise<void>((resolve, reject) => {
      fs.unlink(tempFilePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Convert PaddleOCR result to our format
    const blocks: Array<{
      text: string;
      confidence: number;
      bbox: [number, number, number, number];
      lineIndex?: number;
      wordIndex?: number;
    }> = [];

    let ocrPageText = '';
    let totalConfidence = 0;

    if (ocrResult.texts && Array.isArray(ocrResult.texts)) {
      for (const item of ocrResult.texts) {
        if (item.text && item.mean !== undefined) {
          blocks.push({
            text: item.text,
            confidence: item.mean,
            bbox: [
              item.box[0][0], // x1
              item.box[0][1], // y1
              item.box[1][0], // x2
              item.box[1][1]  // y2
            ]
          });
          ocrPageText += item.text + ' ';
          totalConfidence += item.mean;
        }
      }
    }

    const averageConfidence = blocks.length > 0 ? totalConfidence / blocks.length : 0;

    pages.push({
      pageNumber: pageNum,
      source: 'ocr',
      text: ocrPageText.trim(),
      confidence: averageConfidence,
      blocks
    });

    fullText += ocrPageText.trim() + '\n\n';
  }

  return {
    text: fullText.trim(),
    pages
  };
}

/**
 * Perform OCR on image files (PNG, JPG, etc.)
 */
export async function ocrImage(buffer: Buffer): Promise<{
  text: string;
  confidence: number;
  blocks: Array<{
    text: string;
    confidence: number;
    bbox: [number, number, number, number];
    lineIndex?: number;
    wordIndex?: number;
  }>;
}> {
  const ocr = await getOcrInstance();

  // Optional: Preprocess image for better OCR results
  const processedImageBuffer = await preprocessImage(buffer);

  // Save processed image for debugging
  await new Promise<void>((resolve, reject) => {
    fs.writeFile(`/tmp/debug-processed-image-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-ocr-image.png`, processedImageBuffer, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Save processed image to temporary file for OCR (since @gutenye/ocr-node expects file paths)
  const tempFilePath = `/tmp/ocr-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`;
  await new Promise<void>((resolve, reject) => {
    fs.writeFile(tempFilePath, processedImageBuffer, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Run PaddleOCR on the image file
  const ocrResult = await ocr.detect(tempFilePath);
  console.log('OCR raw result (image):', JSON.stringify(ocrResult, null, 2));

  // Clean up temporary file
  await new Promise<void>((resolve, reject) => {
    fs.unlink(tempFilePath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Convert PaddleOCR result to our format
  const blocks: Array<{
    text: string;
    confidence: number;
    bbox: [number, number, number, number];
    lineIndex?: number;
    wordIndex?: number;
  }> = [];

  let fullText = '';
  let totalConfidence = 0;

  if (ocrResult.texts && Array.isArray(ocrResult.texts)) {
    for (const item of ocrResult.texts) {
      if (item.text && item.mean !== undefined) {
        blocks.push({
          text: item.text,
          confidence: item.mean,
          bbox: [
            item.box[0][0], // x1
            item.box[0][1], // y1
            item.box[1][0], // x2
            item.box[1][1]  // y2
          ]
        });
        fullText += item.text + ' ';
        totalConfidence += item.mean;
      }
    }
  }

  const averageConfidence = blocks.length > 0 ? totalConfidence / blocks.length : 0;

  return {
    text: fullText.trim(),
    confidence: averageConfidence,
    blocks
  };
}

/**
 * Enhanced PDF parsing with OCR fallback
 * Tries regular text extraction first, falls back to OCR if needed
 */
export async function parsePDFWithOCR(buffer: Buffer): Promise<string> {
  const result = await ocrPDF(buffer);
  return result.text;
}

/**
 * Enhanced Word processing with OCR fallback for scanned documents
 * Extracts embedded images from DOCX and runs OCR on them
 */
export async function parseWordWithOCR(buffer: Buffer): Promise<string> {
  // First try regular Word text extraction
  try {
    const result = await mammoth.extractRawText({ buffer });
    const regularText = result.value;

    // If we got sufficient text, return it
    if (await isTextSufficient(regularText)) {
      return regularText;
    }
  } catch (error) {
    console.warn('Regular Word parsing failed:', error);
  }

  // If regular extraction failed or returned insufficient text,
  // extract embedded images from DOCX and run OCR on them
  console.log('Attempting OCR for embedded images in Word document...');

  // For now, we'll fall back to treating the whole doc as an image
  // A more sophisticated approach would be to parse the DOCX and extract images
  // This requires a DOCX parsing library like docx or mammoth-extract-images
  try {
    const ocrResult = await ocrImage(buffer);
    return ocrResult.text;
  } catch (error) {
    console.error('OCR failed for Word document:', error);
    throw new Error('Word document requires OCR but processing failed. Please ensure the document is a valid image or contains extractable text.');
  }
}

/**
 * Check if file likely needs OCR based on file type and initial text extraction
 */
export async function needsOCR(file: Express.Multer.File): Promise<boolean> {
  try {
    const buffer = await fs.promises.readFile(file.path);

    if (file.mimetype === 'application/pdf') {
      // Try native text extraction first
      try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return !(await isTextSufficient(result.text));
      } catch (error) {
        // If native extraction fails, assume OCR is needed
        return true;
      }
    }

    if (
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // Try native text extraction first
      try {
        const result = await mammoth.extractRawText({ buffer });
        return !(await isTextSufficient(result.value));
      } catch (error) {
        // If native extraction fails, assume OCR is needed
        return true;
      }
    }

    // For Excel files, check if they might contain image-based content
    // Note: This is a simplified check - true Excel OCR would require extracting
    // embedded images and running OCR on them, which is complex
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/ms-excel'
    ) {
      // For now, we'll conservatively say Excel files don't typically need OCR
      // In a full implementation, we'd extract images from the Excel workbook
      // and run OCR on those images
      return false;
    }

    return false;
  } catch (error) {
    console.error('Error checking if OCR needed:', error);
    // If we can't determine, assume OCR might be needed for safety
    return file.mimetype === 'application/pdf';
  }
}

/**
 * Preprocess image for better OCR results
 * Applies conservative preprocessing where useful
 */
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Use sharp for image preprocessing
    let image = sharp(imageBuffer);

    // Get image metadata
    const metadata = await image.metadata();

    // Apply preprocessing only if beneficial
    // Convert to grayscale if it's a color image (often helps OCR)
    if (metadata.channels === 3 || metadata.channels === 4) {
      image = image.grayscale();
    }

    // Normalize contrast
    image = image.normalize();

    // Ensure reasonable DPI for OCR (200-300 DPI is ideal)
    // We'll target 200 DPI, but only if the image is much higher resolution
    if (metadata.width > 2000 || metadata.height > 2000) {
      // Resize to reasonable dimensions while maintaining aspect ratio
      const scale = Math.min(2000 / metadata.width, 2000 / metadata.height);
      if (scale < 1) {
        const newWidth = Math.round(metadata.width * scale);
        const newHeight = Math.round(metadata.height * scale);
        image = image.resize(newWidth, newHeight);
      }
    }

    // Apply light denoising for noisy images
    // image = image.blur(); // Commented out as it can blur text

    return await image.toBuffer();
  } catch (error) {
    // If preprocessing fails, return original image
    console.warn('Image preprocessing failed, using original image:', error);
    return imageBuffer;
  }
}