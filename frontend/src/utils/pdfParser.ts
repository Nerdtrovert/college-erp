import { CalendarEvent, EventType } from '../components/AcademicCalendar';

/**
 * Parses a PDF file to extract calendar events
 * Currently implements a simplified version - in production would use pdfjs-dist
 */
export const parsePDFForEvents = async (file: File): Promise<CalendarEvent[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        // In a real implementation, we would use pdfjs-dist here:
        // const { PDFDocument } = require('pdfjs-dist');
        // const pdfData = new Uint8Array(e.target?.result as ArrayBuffer);
        // const pdf = await PDFDocument.load(pdfData);
        // const text = await pdf.getText();
        // Then parse the text to extract events
        
        // For now, we'll simulate PDF parsing with mock data
        // This demonstrates the expected structure
        const mockEvents: CalendarEvent[] = [
          { date: '2025-09-22', title: 'CIE - I (Mathematics)', type: 'cie' },
          { date: '2025-09-24', title: 'CIE - I (Physics)', type: 'cie' },
          { date: '2025-09-26', title: 'CIE - I (Chemistry)', type: 'cie' },
          { date: '2025-10-20', title: 'CIE - II (Mathematics)', type: 'cie' },
          { date: '2025-10-22', title: 'CIE - II (Physics)', type: 'cie' },
          { date: '2025-10-24', title: 'CIE - II (Chemistry)', type: 'cie' },
        ];
        
        // Simulate network delay
        setTimeout(() => resolve(mockEvents), 1000);
      } catch (error) {
        reject(new Error(`Failed to parse PDF: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Extracts date from text in various formats
 * Helper function for PDF parsing
 */
export const extractDateFromText = (text: string): string | null => {
  // Match common date formats: YYYY-MM-DD, DD/MM/MM, MM/DD/YYYY, etc.
  const datePatterns = [
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, // YYYY-MM-DD
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, // MM/DD/YYYY or DD/MM/YYYY
    /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/, // MM-DD-YYYY or DD-MM-YYYY
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      // For simplicity, assuming YYYY-MM-DD format or converting to it
      // In a real implementation, we'd need more sophisticated date parsing
      if (match[1].length === 4) {
        // YYYY-MM-DD format
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else if (match[3].length === 4) {
        // MM/DD/YYYY or DD/MM/YYYY - assuming MM/DD/YYYY for now
        return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      }
    }
  }
  
  return null;
};

/**
 * Determines event type based on text content
 */
export const extractEventTypeFromText = (text: string): EventType => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('cie') || lowerText.includes('assessment') || lowerText.includes('lab cie')) {
    return 'cie';
  }
  
  if (lowerText.includes('holiday') || 
      lowerText.includes('gandhi jayanti') ||
      lowerText.includes('dussehra') ||
      lowerText.includes('deepavali') ||
      lowerText.includes('christmas') ||
      lowerText.includes('valmiki jayanti')) {
    return 'government';
  }
  
  if (lowerText.includes('sunday')) {
    return 'general';
  }
  
  // Default to academic
  return 'academic';
};
