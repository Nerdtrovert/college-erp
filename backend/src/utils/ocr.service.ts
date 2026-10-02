import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { Workbook } from 'exceljs';
import mammoth from 'mammoth';

// OCR dependencies - loaded dynamically to handle missing dependencies gracefully
let Tesseract: any = null;
let pdfjsLib: any = null;
let Canvas: any = null;

// Initialize OCR dependencies if available
try {
  Tesseract = require('tesseract.js');
} catch (e) {
  // Tesseract.js not available - OCR functionality will be limited
}

try {
  pdfjsLib = require('pdfjs-dist');
} catch (e) {
  // pdfjs-dist not available - OCR functionality will be limited
}

try {
  Canvas = require('canvas');
} catch (e) {
  // canvas not available - OCR functionality will be limited
}

// Note: For a complete OCR implementation, the following dependencies would need to be added:
// - 'tesseract.js': ^2.1.0
// - 'pdfjs-dist': ^3.4.120
// - 'canvas': ^2.11.0 (for Node.js PDF rendering to images)
//
// The service will still work for basic file parsing, but OCR fallback will not be available
// if these dependencies are missing.

/**
 * OCR Service for extracting text from image-based PDFs and images
 * Uses Tesseract.js for OCR capabilities
 */
export class OCRService {
  private static readonly MIN_TEXT_LENGTH = 50; // Minimum characters to consider text extraction successful
  private static readonly OCR_LANGUAGES = 'eng'; // English language for OCR
  private static readonly OCR_CONFIG = {
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.:,-() /',
    preserve_interword_spaces: '1',
  };

  /**
   * Check if extracted text is sufficient (not just whitespace or very short)
   */
  public static isTextSufficient(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const cleanedText = text.trim();
    return cleanedText.length >= this.MIN_TEXT_LENGTH;
  }

  /**
   * Perform OCR on PDF data
   * Converts PDF pages to images and runs OCR on each page
   */
  static async ocrPDF(buffer: Buffer): Promise<string> {
    try {
      if (!pdfjsLib) {
        throw new Error(
          'OCR functionality requires the "pdfjs-dist" package to be installed. ' +
          'Please install it with: npm install pdfjs-dist'
        );
      }

      if (!Canvas) {
        throw new Error(
          'OCR functionality requires the "canvas" package to be installed. ' +
          'Please install it with: npm install canvas'
        );
      }

      // Load PDF using pdfjs-dist
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;

      let fullText = '';

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Render page to canvas using Node.js canvas
        const viewport = page.getViewport({ scale: 2.0 }); // Scale for better OCR accuracy
        const { Canvas: CanvasClass, Image: ImageClass } = Canvas;
        const canvas = new CanvasClass(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;

        // Extract image data as buffer and run OCR
        const imageBuffer = canvas.toBuffer('image/png');

        // Convert to format Tesseract can use
        const { data: { text } } = await Tesseract.recognize(
          imageBuffer,
          this.OCR_LANGUAGES,
          {
            logger: (m: string) => console.log(m), // Optional: log OCR progress
            ...this.OCR_CONFIG
          }
        );

        fullText += text + '\n\n'; // Add spacing between pages
      }

      return fullText.trim();
    } catch (error) {
      console.error('OCR PDF processing error:', error);
      throw new Error(`OCR failed for PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform OCR on image files (PNG, JPG, etc.)
   */
  static async ocrImage(buffer: Buffer): Promise<string> {
    if (!Tesseract) {
      throw new Error(
        'OCR functionality requires the "tesseract.js" package to be installed. ' +
        'Please install it with: npm install tesseract.js'
      );
    }

    try {
      const { data: { text } } = await Tesseract.recognize(
        buffer,
        this.OCR_LANGUAGES,
        {
          logger: (m: string) => console.log(m), // Optional: log OCR progress
          ...this.OCR_CONFIG
        }
      );
      return text.trim();
    } catch (error) {
      console.error('OCR image processing error:', error);
      throw new Error(`OCR failed for image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Enhanced PDF parsing with OCR fallback
   * Tries regular text extraction first, falls back to OCR if needed
   */
  static async parsePDFWithOCR(buffer: Buffer): Promise<string> {
    // First try regular PDF text extraction
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const regularText = result.text;

      // If we got sufficient text, return it
      if (this.isTextSufficient(regularText)) {
        return regularText;
      }
    } catch (error) {
      console.warn('Regular PDF parsing failed, trying OCR:', error);
    }

    // If regular extraction failed or returned insufficient text, try OCR
    console.log('Attempting OCR for PDF...');
    return this.ocrPDF(buffer);
  }

  /**
   * Enhanced Word parsing with OCR fallback for scanned documents
   * Note: Mammoth usually works well for .docx, but if it's a scanned image in docx, we'd need different approach
   */
  static async parseWordWithOCR(buffer: Buffer): Promise<string> {
    // First try regular Word text extraction
    try {
      const result = await mammoth.extractRawText({ buffer });
      const regularText = result.value;

      // If we got sufficient text, return it
      if (this.isTextSufficient(regularText)) {
        return regularText;
      }
    } catch (error) {
      console.warn('Regular Word parsing failed:', error);
    }

    // For Word documents, OCR is more complex as we'd need to extract images first
    // This is a placeholder - in practice, you'd need to extract embedded images from docx
    // and run OCR on those images
    console.log('Word OCR not implemented - would need to extract images from docx first');
    throw new Error('Word document requires OCR but image extraction from docx is not implemented');
  }

  /**
   * Check if file likely needs OCR based on file type and initial text extraction
   */
  static async needsOCR(file: Express.Multer.File): Promise<boolean> {
    try {
      const buffer = await fs.promises.readFile(file.path);

      if (file.mimetype === 'application/pdf') {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return !this.isTextSufficient(result.text);
      }

      if (
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const result = await mammoth.extractRawText({ buffer });
        return !this.isTextSufficient(result.value);
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
}