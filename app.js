const express = require('express');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = 3000;

app.use(express.json());

// Generate PDF endpoint
app.post('/generate-pdf', (req, res) => {
  try {
    // Use sample data if no valid data provided
    let data = req.body;
    if (!data || !data.pages || !Array.isArray(data.pages)) {
      data = getSampleData();
    }

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    generatePDF(doc, data);
    doc.end();

  } catch (error) {
    console.error('Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'PDF generation failed' });
    }
  }
});

function generatePDF(doc, data) {
  // Validate data structure
  if (!data || !data.pages || !Array.isArray(data.pages)) {
    throw new Error('Invalid data structure');
  }

  // Generate content for all pages
  for (let pageIndex = 0; pageIndex < data.pages.length; pageIndex++) {
    if (pageIndex > 0) {
      doc.addPage();
    }

    // Add header with logos
    addHeader(doc);

    // Add person details (different for first vs other pages)
    let yPos = 120;
    yPos = addPersonSection(doc, data.person, pageIndex === 0, yPos);

    // Add sections for this page
    const pageData = data.pages[pageIndex];
    if (pageData && pageData.sections) {
      for (const section of pageData.sections) {
        yPos = addSection(doc, section, yPos);
      }
    }
  }

  // Add page numbers after all content is generated
  const totalPages = data.pages.length;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i + 1);  // PDFKit uses 1-based page indexing
    addFooter(doc, i + 1, totalPages);
  }
}

function addHeader(doc) {
  // Left logo
  try {
    doc.image('LOGOBRAINWAVE.jpeg', 50, 30, { width: 60, height: 40 });
  } catch (error) {
    // Fallback to placeholder if image fails
    doc.rect(50, 30, 60, 40).stroke();
    doc.fontSize(8).text('LOGO', 65, 48);
  }

  // Company name in center
  doc.fontSize(16).text('BrainWave Technologies', 0, 45, { width: doc.page.width, align: 'center' });

  // Right logo
  try {
    doc.image('LOGOBRAINWAVE.jpeg', doc.page.width - 110, 30, { width: 60, height: 40 });
  } catch (error) {
    // Fallback to placeholder if image fails
    doc.rect(doc.page.width - 110, 30, 60, 40).stroke();
    doc.fontSize(8).text('LOGO', doc.page.width - 95, 48);
  }

  // Header line
  doc.moveTo(50, 90).lineTo(doc.page.width - 50, 90).stroke();
}

function addPersonSection(doc, person, isFirstPage, yPos) {
  doc.fontSize(12).text('Person Details', 50, yPos);
  yPos += 25;

  // Fields to show
  const fields = isFirstPage
    ? ['name', 'email', 'phone', 'department']
    : ['name', 'email', 'phone', 'department', 'position', 'id', 'startDate', 'manager'];

  // Add person details in two columns
  for (let i = 0; i < fields.length; i += 2) {
    const field1 = fields[i];
    const field2 = fields[i + 1];

    // Left column
    doc.fontSize(10).text(`${field1}:`, 50, yPos);
    doc.text(person[field1] || 'N/A', 50, yPos + 12);

    // Right column (if exists)
    if (field2) {
      doc.fontSize(10).text(`${field2}:`, 300, yPos);
      doc.text(person[field2] || 'N/A', 300, yPos + 12);
    }

    yPos += 35;
  }

  return yPos + 20;
}

function addSection(doc, section, yPos) {
  // Section heading
  doc.fontSize(14).text(section.title, 50, yPos);
  yPos += 25;

  if (section.type === 'table') {
    return addTable(doc, section.data, yPos);
  } else if (section.type === 'chart') {
    return addChart(doc, section.data, yPos);
  }

  return yPos;
}

function addTable(doc, tableData, yPos) {
  for (const row of tableData) {
    // Key
    doc.fontSize(10).text(`${row.key}:`, 50, yPos, { width: 150 });

    // Value (can be long text)
    const valueHeight = doc.heightOfString(row.value, { width: 350 });
    doc.fontSize(10).text(row.value, 220, yPos, { width: 350 });

    yPos += Math.max(20, valueHeight + 5);

    // Check if we need new page
    if (yPos > 700) {
      break; // Let overflow handling manage this
    }
  }

  return yPos + 20;
}

function addChart(doc, chartData, yPos) {
  // Chart title
  doc.fontSize(12).text(chartData.title, 50, yPos);
  yPos += 30;

  // Chart area
  const chartWidth = 400;
  const chartHeight = 200;

  // Convert time strings to minutes for calculation
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Find min and max time values for Y-axis scaling
  const allTimeValues = chartData.datasets.flatMap(d => d.data.map(point => timeToMinutes(point.timeValue)));
  const minTime = Math.min(...allTimeValues);
  const maxTime = Math.max(...allTimeValues);
  const timeRange = maxTime - minTime;

  // Chart border
  doc.rect(50, yPos, chartWidth, chartHeight).stroke();

  // X-axis processing (points)
  const maxPoints = Math.max(...chartData.datasets.map(d => d.data.length));

  // Draw lines for each dataset
  chartData.datasets.forEach((dataset, datasetIndex) => {
    const color = dataset.color;
    let prevX = null, prevY = null;

    // Draw data points and connect with smooth lines
    dataset.data.forEach((point, pointIndex) => {
      const x = 50 + ((pointIndex / (dataset.data.length - 1)) * chartWidth);
      const timeMinutes = timeToMinutes(point.timeValue);
      const y = yPos + chartHeight - (((timeMinutes - minTime) / timeRange) * chartHeight);

      // Draw line from previous point
      if (prevX !== null && prevY !== null) {
        doc.moveTo(prevX, prevY)
          .lineTo(x, y)
          .strokeColor(color)
          .lineWidth(2)
          .stroke();
      }

      // Draw data point
      doc.circle(x, y, 2)
        .fillColor(color)
        .fill();

      prevX = x;
      prevY = y;
    });

    // Legend
    const legendY = yPos + chartHeight + 20 + (datasetIndex * 15);
    doc.rect(50, legendY, 10, 10).fillColor(color).fill();
    doc.fontSize(10).fillColor('black').text(dataset.label, 70, legendY + 2);
  });

  // Y-axis time labels (left side)
  const timeStep = Math.ceil(timeRange / 6); // Show ~6 time labels
  for (let i = 0; i <= 6; i++) {
    const timeMinutes = minTime + (i * timeStep);
    if (timeMinutes <= maxTime) {
      const y = yPos + chartHeight - (((timeMinutes - minTime) / timeRange) * chartHeight);
      const timeLabel = minutesToTime(timeMinutes);
      doc.fontSize(8).fillColor('black').text(timeLabel, 15, y - 3);

      // Grid line
      doc.moveTo(45, y)
        .lineTo(50, y)
        .strokeColor('#cccccc')
        .stroke();
    }
  }

  // X-axis point labels (bottom)
  const pointStep = Math.ceil(maxPoints / 8); // Show ~8 point labels
  for (let i = 0; i < maxPoints; i += pointStep) {
    const x = 50 + ((i / (maxPoints - 1)) * chartWidth);
    doc.fontSize(8).fillColor('black').text(`P${i + 1}`, x - 8, yPos + chartHeight + 5);
  }

  // Y-axis label
  doc.fontSize(10).fillColor('black').text('Time', 10, yPos + chartHeight / 2 - 10);

  // X-axis label
  doc.fontSize(10).fillColor('black').text('Data Points', 50 + chartWidth / 2 - 30, yPos + chartHeight + 25);

  return yPos + chartHeight + 70 + (chartData.datasets.length * 15);
}

function addFooter(doc, currentPage, totalPages) {
  doc.fontSize(10).text(
    `Page ${currentPage} of ${totalPages}`,
    0,
    doc.page.height - 30,
    { align: 'center' }
  );
}

function getSampleData() {
  return {
    person: {
      name: 'John Smith',
      email: 'john.smith@company.com',
      phone: '+1 (555) 123-4567',
      department: 'Engineering',
      position: 'Senior Developer',
      id: 'EMP001',
      startDate: '2022-01-15',
      manager: 'Sarah Johnson'
    },
    pages: [
      {
        sections: [
          {
            title: 'Project Information',
            type: 'table',
            data: [
              { key: 'Project Name', value: 'E-commerce Platform' },
              { key: 'Status', value: 'In Progress' },
              { key: 'Description', value: 'Building a scalable e-commerce platform with microservices architecture. This project involves multiple teams and requires coordination across frontend, backend, and DevOps teams.' },
              { key: 'Technologies', value: 'Node.js, React, PostgreSQL, Docker, Kubernetes' },
              { key: 'Timeline', value: '6 months development cycle with weekly sprints and continuous deployment' }
            ]
          },
          {
            title: 'Performance Chart',
            type: 'chart',
            data: {
              title: 'Daily Work Time Tracking',
              datasets: [
                {
                  label: 'Project Alpha',
                  data: [
                    { timeValue: '09:15' },
                    { timeValue: '09:45' },
                    { timeValue: '10:30' },
                    { timeValue: '11:15' },
                    { timeValue: '12:00' },
                    { timeValue: '13:30' },
                    { timeValue: '14:15' },
                    { timeValue: '15:00' },
                    { timeValue: '15:45' },
                    { timeValue: '16:30' },
                    { timeValue: '17:15' },
                    { timeValue: '18:00' }
                  ],
                  color: '#3498db'
                },
                {
                  label: 'Project Beta',
                  data: [
                    { timeValue: '08:30' },
                    { timeValue: '09:00' },
                    { timeValue: '09:30' },
                    { timeValue: '10:45' },
                    { timeValue: '11:30' },
                    { timeValue: '12:45' },
                    { timeValue: '13:15' },
                    { timeValue: '14:00' },
                    { timeValue: '14:45' },
                    { timeValue: '15:30' },
                    { timeValue: '16:15' },
                    { timeValue: '17:00' }
                  ],
                  color: '#e74c3c'
                },
                {
                  label: 'Code Reviews',
                  data: [
                    { timeValue: '10:00' },
                    { timeValue: '10:15' },
                    { timeValue: '11:00' },
                    { timeValue: '12:15' },
                    { timeValue: '13:00' },
                    { timeValue: '14:30' },
                    { timeValue: '15:15' },
                    { timeValue: '16:00' },
                    { timeValue: '16:45' },
                    { timeValue: '17:30' },
                    { timeValue: '18:15' },
                    { timeValue: '19:00' }
                  ],
                  color: '#2ecc71'
                }
              ]
            }
          }
        ]
      },
      {
        sections: [
          {
            title: 'Skills & Experience',
            type: 'table',
            data: [
              { key: 'Programming', value: 'JavaScript, Python, Java, C++' },
              { key: 'Frameworks', value: 'React, Node.js, Express, Django' },
              { key: 'Databases', value: 'PostgreSQL, MongoDB, Redis' },
              { key: 'Cloud', value: 'AWS, Docker, Kubernetes' },
              { key: 'Experience', value: '5+ years in full-stack development with expertise in building scalable web applications' }
            ]
          }
        ]
      }
    ]
  };
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Generate PDF: POST http://localhost:${PORT}/generate-pdf`);
});

module.exports = app; 
