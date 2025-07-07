// Data processing utilities for Excel file handling

export const P2P_REQUIRED_COLUMNS = [
  'Company Code',
  'Plant',
  'PR Document Type',
  'PR Date',
  'PR Number',
  'PR Quantity',
  'PR UOM',
  'PO Document Type',
  'PO Date',
  'PO Number',
  'Payment Term',
  'Supplier',
  'Supplier Name',
  'Material',
  'Material Description',
  'PO Quantity',
  'PO UOM',
  'Exchange Rate',
  'Net Price/Unit',
  'Curr Key',
  'PO Amount',
  'State Code',
  'HSN/SAC',
  'MD.Year',
  'MD Date',
  'GR Quantity',
  'GR UOM',
  'Mov Type',
  'Inv.Date',
  'Gross Amount',
  'Inv.Posting Date',
  'BOE',
  'BOE Date',
  'BOL Date',
  'Delivery Agent',
  'Vessel Name',
  'Payment Date'
];

export const PURCHASE_REQUIRED_COLUMNS = [
  'Company Code',
  'Doc.Type',
  'Invoice Type',
  'Supply Type',
  'Type of Counterparty',
  'Vendor Code',
  'Vendor Name',
  'Invoice/Document Date',
  'Inv.Creation Date',
  'Imp/Loc',
  'Place Of Supply',
  'Supplier State',
  'Whether Reverse Charge is Applicable',
  'Line Item',
  'Item Type(G-GOODS/S-Services)',
  'HSN/SAC',
  'Quantity',
  'Gross value',
  'Taxable Value LC',
  'Taxable value DC',
  'PO Num.',
  'PO Date',
  'Fiscal Year',
  'SAP Pymt.Date',
  'Posting Date',
  'Plant code',
  'Cost Center',
  'Material Number',
  'Material Description',
  'Purchase Order Qty',
  'GRN Number',
  'GRN Date',
  'GRN Document Year',
  'GRN Qty',
  'Currency',
  'Expense GL',
  'Segment',
  'Profit Center',
  'Doc Type for GST',
  'INV Reference',
  'INV Ref Year',
  'Incoterms',
  'Incoterms Location'
];

export const SALES_REQUIRED_COLUMNS = [
  'Sales Org',
  'Plant',
  'Customer Code',
  'Customer Name',
  'Type',
  'Document Type',
  'Sales Doc No',
  'Sales Doc Date',
  'Sales Order No',
  'Sales Order Date',
  'Item Code',
  'Item Name',
  'Quantity',
  'Unit Price',
  'Quantity x Price',
  'CGST',
  'SGST',
  'IGST',
  'Document Total',
  'WP',
  'Mega Watts',
  'Price Unit',
  'Segmet',
  'Product Type',
  'Company Code',
  'Division',
  'Distribution Channel',
  'Sales Posting Date',
  'Sales Creation Date',
  'FY Year',
  'FY_Quarter',
  'CY_Quarter',
  'City',
  'Region',
  'Business Place',
  'Material type',
  'Material Group',
  'Item GROUP',
  'Currency Type',
  'Ex Rate',
  'Line Discount%',
  'Line Discount Amount',
  'After Discount',
  'Tax Code',
  'Sold to Party Code',
  'Sold to party Name',
  'Sold to Party Address',
  'Sold to Party Region',
  'Sold to Party Postal Code',
  'Sold to Party City',
  'Ship to Party Code',
  'Ship to Party Name',
  'Ship to Party Address',
  'Ship to Party Region',
  'Ship to Party Postal Code',
  'Ship to Party City',
  'Unit of Measure',
  'Cancelled billing Doc.No'
];

export const convertToTextFile = (data: any[], filename: string) => {
  if (data.length === 0) {
    return;
  }

  // Get all column headers
  const headers = Object.keys(data[0]);
  
  // Create header row
  let textContent = headers.join('\t') + '\n';
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      return value !== null && value !== undefined ? String(value) : '';
    });
    textContent += values.join('\t') + '\n';
  });

  // Create and download file
  const blob = new Blob([textContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getFormattedDateTime = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
};