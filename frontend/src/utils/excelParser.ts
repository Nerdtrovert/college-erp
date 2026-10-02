import { Spreadsheet } from '@syncfusion/ej2-spreadsheet';

export type ExcelRow = Record<string, unknown>;

export const parseExcelFile = (file: File): Promise<ExcelRow[]> => new Promise((resolve, reject) => {
  const host = document.createElement('div');
  host.style.display = 'none';
  document.body.appendChild(host);

  const spreadsheet = new Spreadsheet({
    showRibbon: false,
    openComplete: () => {
      try {
        const sheet = spreadsheet.sheets[0];
        const maxRow = sheet?.usedRange?.rowIndex ?? -1;
        const maxColumn = sheet?.usedRange?.colIndex ?? -1;
        const rows: ExcelRow[] = [];
        const headers = Array.from({ length: maxColumn + 1 }, (_, columnIndex) => (
          String(sheet?.rows?.[0]?.cells?.[columnIndex]?.value ?? '').trim()
        ));

        for (let rowIndex = 1; rowIndex <= maxRow; rowIndex += 1) {
          const row: ExcelRow = {};
          for (let columnIndex = 0; columnIndex <= maxColumn; columnIndex += 1) {
            const header = headers[columnIndex];
            if (header) row[header] = sheet?.rows?.[rowIndex]?.cells?.[columnIndex]?.value;
          }
          if (Object.keys(row).length > 0) rows.push(row);
        }

        resolve(rows);
      } catch (error) {
        reject(error);
      } finally {
        spreadsheet.destroy();
        host.remove();
      }
    },
    openFailure: (args: unknown) => {
      spreadsheet.destroy();
      host.remove();
      reject(args);
    },
  });

  spreadsheet.appendTo(host);
  spreadsheet.open({ file });
});
