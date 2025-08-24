declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: {
      head?: any[][];
      body?: any[][];
      startY?: number;
      styles?: any;
      headStyles?: any;
      alternateRowStyles?: any;
      margin?: any;
      [key: string]: any;
    }) => jsPDF;
  }
}

declare module 'jspdf-autotable';