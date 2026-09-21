import re

with open('frontend/src/components/supervisor/ReportsDashboard.tsx', 'r') as f:
    content = f.read()

old_block = """          children: [
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'ID'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'Name'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'Department'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'Class Group'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: '# Backlogs'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'Best 2 CIE Avg'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'CIE Scaled'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'Assign Total'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'Lab Total'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'Total Score'
              })]
            }),
            new docx.TableCell({
              children: [new docx.Paragraph({
                text: 'Verge Status'
              })]
            })
          ]"""

new_block = """          children: [
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'ID', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Name', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Department', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Class Group', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: '# Backlogs', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Best 2 CIE Avg', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'CIE Scaled', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Assign Total', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Lab Total', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Total Score', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Verge Status', bold: true })] })] })
          ]"""

updated = content.replace(old_block, new_block)

# Also fix the title to be explicitly bold using TextRun
old_title = """          new docx.Paragraph({
            text: 'Verge of Backlog Report',
            heading: docx.HeadingLevel.TITLE,
            alignment: docx.AlignmentType.CENTER
          }),"""

new_title = """          new docx.Paragraph({
            children: [new docx.TextRun({ text: 'Verge of Backlog Report', bold: true, size: 36 })],
            alignment: docx.AlignmentType.CENTER
          }),"""

updated = updated.replace(old_title, new_title)

with open('frontend/src/components/supervisor/ReportsDashboard.tsx', 'w') as f:
    f.write(updated)
