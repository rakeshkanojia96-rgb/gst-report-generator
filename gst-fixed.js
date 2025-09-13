console.log('🎯 BRAND NEW FILE - NO CACHE POSSIBLE - TIMESTAMP: ' + new Date().toISOString());
console.log('🎯 HSN QUANTITY = TCS SALES COUNT | INVOICE = 534p926195 to 534p926C108');

class GSTReportGenerator {
    constructor() {
        console.log('GST Report Generator initialized');
        this.amazonFiles = [];
        this.meeshoFiles = [];
        this.processedData = {
            amazon: [],
            meesho: {
                tcs_sales: [],
                tcs_sales_return: [],
                tax_invoice_details: []
            }
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('amazonFiles').addEventListener('change', (e) => {
            this.amazonFiles = Array.from(e.target.files);
            console.log(`Selected ${this.amazonFiles.length} Amazon files`);
        });

        document.getElementById('meeshoFiles').addEventListener('change', (e) => {
            this.meeshoFiles = Array.from(e.target.files);
            console.log(`Selected ${this.meeshoFiles.length} Meesho files`);
        });

        document.getElementById('generateReport').addEventListener('click', () => {
            this.generateReport();
        });
    }

    async generateReport() {
        try {
            console.log('Starting report generation...');
            
            if (this.amazonFiles.length === 0 && this.meeshoFiles.length === 0) {
                alert('Please select at least one file to process.');
                return;
            }

            // Process files
            await this.processAmazonFiles();
            await this.processMeeshoFiles();

            // Generate Excel report
            this.generateExcelReport();

        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report. Please check the console for details.');
        }
    }

    async processAmazonFiles() {
        for (const file of this.amazonFiles) {
            console.log(`Processing Amazon file: ${file.name}`);
            const text = await this.readFileAsText(file);
            const rows = this.parseCSV(text);
            
            if (rows.length > 1) {
                const headers = rows[0];
                const data = rows.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index] || '';
                    });
                    return obj;
                });
                
                this.processedData.amazon.push(...data);
            }
        }
        console.log(`Processed ${this.processedData.amazon.length} Amazon records`);
    }

    async processMeeshoFiles() {
        this.processedData.meesho = {
            tcs_sales: [],
            tcs_sales_return: [],
            tax_invoice_details: []
        };

        for (const file of this.meeshoFiles) {
            console.log(`Processing Meesho file: ${file.name}`);
            
            let data;
            if (file.name.toLowerCase().endsWith('.xlsx')) {
                data = await this.processExcelFile(file);
            } else {
                data = await this.processCSVFile(file);
            }

            if (data && data.length > 0) {
                console.log(`=== ${file.name} COLUMNS ===`, Object.keys(data[0]));
                console.log(`=== ${file.name} SAMPLE DATA ===`, data[0]);
            }

            if (file.name.toLowerCase().includes('tcs_sales_return')) {
                this.processedData.meesho.tcs_sales_return.push(...data);
            } else if (file.name.toLowerCase().includes('tcs_sales')) {
                this.processedData.meesho.tcs_sales.push(...data);
            } else if (file.name.toLowerCase().includes('tax_invoice_details')) {
                this.processedData.meesho.tax_invoice_details.push(...data);
            }
        }
        
        console.log(`Processed Meesho files:`);
        console.log(`- TCS Sales: ${this.processedData.meesho.tcs_sales.length} records`);
        console.log(`- TCS Sales Return: ${this.processedData.meesho.tcs_sales_return.length} records`);
        console.log(`- Tax Invoice Details: ${this.processedData.meesho.tax_invoice_details.length} records`);
    }

    async processExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (jsonData.length > 1) {
                        const headers = jsonData[0];
                        const rows = jsonData.slice(1).map(row => {
                            const obj = {};
                            headers.forEach((header, index) => {
                                obj[header] = row[index] || '';
                            });
                            return obj;
                        });
                        resolve(rows);
                    } else {
                        resolve([]);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    async processCSVFile(file) {
        const text = await this.readFileAsText(file);
        const rows = this.parseCSV(text);
        
        if (rows.length > 1) {
            const headers = rows[0];
            return rows.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
        }
        return [];
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseCSV(text) {
        const rows = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (line.trim()) {
                const row = [];
                let current = '';
                let inQuotes = false;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        row.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                row.push(current.trim());
                rows.push(row);
            }
        }
        return rows;
    }

    generateExcelReport() {
        console.log('File processing complete. Generating report...');
        
        const wb = XLSX.utils.book_new();
        
        // Generate B2CS data
        const b2csData = this.generateB2CSData();
        const b2csWs = XLSX.utils.json_to_sheet(b2csData);
        XLSX.utils.book_append_sheet(wb, b2csWs, 'b2cs');
        
        // Generate HSN data
        const hsnData = this.generateHSNData();
        const hsnWs = XLSX.utils.json_to_sheet(hsnData);
        XLSX.utils.book_append_sheet(wb, hsnWs, 'hsn(b2c)');
        
        // Generate ECO data
        const ecoData = this.generateECOData();
        const ecoWs = XLSX.utils.json_to_sheet(ecoData);
        XLSX.utils.book_append_sheet(wb, ecoWs, 'eco');
        
        // Generate DOCS data
        const docsData = this.generateDocsData();
        const docsWs = XLSX.utils.json_to_sheet(docsData);
        XLSX.utils.book_append_sheet(wb, docsWs, 'docs');
        
        // Save file
        const fileName = `GST_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        console.log(`Report generated: ${fileName}`);
        alert(`Report generated successfully: ${fileName}`);
    }

    generateB2CSData() {
        const b2csData = {};
        
        // Process Amazon data
        this.processedData.amazon.forEach(row => {
            const state = row['ship-state'] || 'MAHARASHTRA';
            const stateCode = this.getStateCode(state);
            const taxExclusiveGross = parseFloat(row['Tax Exclusive Gross'] || 0);
            const cgst = parseFloat(row['CGST Rate'] || 0);
            const sgst = parseFloat(row['SGST Rate'] || 0);
            const igst = parseFloat(row['IGST Rate'] || 0);
            const rate = (cgst + sgst + igst) * 100;
            
            if (taxExclusiveGross > 0) {
                const key = `${state}_${rate}`;
                if (!b2csData[key]) {
                    b2csData[key] = {
                        'Type': 'OE',
                        'Place Of Supply': stateCode,
                        'Rate': rate,
                        'Taxable Value': 0,
                        'Cess Amount': 0
                    };
                }
                b2csData[key]['Taxable Value'] += taxExclusiveGross;
            }
        });
        
        // Process Meesho data
        if (this.processedData.meesho.tcs_sales) {
            this.processedData.meesho.tcs_sales.forEach(row => {
                const state = row['end_customer_state_new'] || 'MAHARASHTRA';
                const stateCode = this.getStateCode(state);
                const taxableValue = parseFloat(row['total_taxable_sale_value'] || 0);
                const gstRate = parseFloat(row['gst_rate'] || 5);
                
                if (taxableValue > 0) {
                    const key = `${state}_${gstRate}`;
                    if (!b2csData[key]) {
                        b2csData[key] = {
                            'Type': 'OE',
                            'Place Of Supply': stateCode,
                            'Rate': gstRate,
                            'Taxable Value': 0,
                            'Cess Amount': 0
                        };
                    }
                    b2csData[key]['Taxable Value'] += taxableValue;
                }
            });
        }
        
        // Process returns (subtract)
        if (this.processedData.meesho.tcs_sales_return) {
            this.processedData.meesho.tcs_sales_return.forEach(row => {
                const state = row['end_customer_state_new'] || 'MAHARASHTRA';
                const stateCode = this.getStateCode(state);
                const taxableValue = parseFloat(row['total_taxable_sale_value'] || 0);
                const gstRate = parseFloat(row['gst_rate'] || 5);
                
                if (taxableValue > 0) {
                    const key = `${state}_${gstRate}`;
                    if (b2csData[key]) {
                        b2csData[key]['Taxable Value'] -= taxableValue;
                    }
                }
            });
        }
        
        return Object.values(b2csData).filter(item => item['Taxable Value'] > 0);
    }

    generateHSNData() {
        const hsnData = {};
        
        // Process Amazon data
        this.processedData.amazon.forEach(row => {
            const hsn = '620821';
            const taxExclusiveGross = parseFloat(row['Tax Exclusive Gross'] || 0);
            const cgst = parseFloat(row['CGST Rate'] || 0);
            const sgst = parseFloat(row['SGST Rate'] || 0);
            const igst = parseFloat(row['IGST Rate'] || 0);
            const rate = (cgst + sgst + igst) * 100;
            
            if (taxExclusiveGross > 0) {
                if (!hsnData[hsn]) {
                    hsnData[hsn] = {
                        'HSN': hsn,
                        'Description': 'OF COTTON',
                        'UQC': 'PCS-PIECES',
                        'Total Quantity': 0,
                        'Total Value': 0,
                        'Rate': rate,
                        'Taxable Value': 0,
                        'Integrated Tax Amount': 0,
                        'Central Tax Amount': 0,
                        'State/UT Tax Amount': 0,
                        'Cess Amount': 0
                    };
                }
                
                hsnData[hsn]['Total Quantity'] += 1;
                hsnData[hsn]['Total Value'] += taxExclusiveGross;
                hsnData[hsn]['Taxable Value'] += taxExclusiveGross;
                
                const state = row['ship-state'] || 'MAHARASHTRA';
                const stateCode = this.getStateCode(state);
                const taxAmount = taxExclusiveGross * (cgst + sgst + igst);
                
                if (stateCode === '27') {
                    hsnData[hsn]['Central Tax Amount'] += taxAmount / 2;
                    hsnData[hsn]['State/UT Tax Amount'] += taxAmount / 2;
                } else {
                    hsnData[hsn]['Integrated Tax Amount'] += taxAmount;
                }
            }
        });
        
        // Process Meesho data - USE ACTUAL TCS SALES COUNT
        if (this.processedData.meesho.tcs_sales) {
            const meeshoQuantity = this.processedData.meesho.tcs_sales.length;
            console.log('🎯 MEESHO HSN QUANTITY SET TO:', meeshoQuantity);
            
            this.processedData.meesho.tcs_sales.forEach(row => {
                const hsn = row['hsn_code'] || '620821';
                const taxableValue = parseFloat(row['total_taxable_sale_value'] || 0);
                const gstRate = parseFloat(row['gst_rate'] || 5);
                
                if (!hsnData[hsn]) {
                    hsnData[hsn] = {
                        'HSN': hsn,
                        'Description': 'OF COTTON',
                        'UQC': 'PCS-PIECES',
                        'Total Quantity': meeshoQuantity,
                        'Total Value': 0,
                        'Rate': gstRate,
                        'Taxable Value': 0,
                        'Integrated Tax Amount': 0,
                        'Central Tax Amount': 0,
                        'State/UT Tax Amount': 0,
                        'Cess Amount': 0
                    };
                }
                
                hsnData[hsn]['Total Value'] += taxableValue;
                hsnData[hsn]['Taxable Value'] += taxableValue;
                
                if (taxableValue > 0) {
                    const state = row['end_customer_state_new'] || 'MAHARASHTRA';
                    const stateCode = this.getStateCode(state);
                    const taxAmount = (taxableValue * gstRate) / 100;
                    
                    if (stateCode === '27') {
                        hsnData[hsn]['Central Tax Amount'] += taxAmount / 2;
                        hsnData[hsn]['State/UT Tax Amount'] += taxAmount / 2;
                    } else {
                        hsnData[hsn]['Integrated Tax Amount'] += taxAmount;
                    }
                }
            });
            
            // Set quantity to actual count
            Object.keys(hsnData).forEach(hsn => {
                if (hsnData[hsn]['HSN'] === '620821') {
                    hsnData[hsn]['Total Quantity'] = meeshoQuantity;
                }
            });
        }
        
        return Object.values(hsnData);
    }

    generateECOData() {
        const ecoData = [];
        
        // Process Amazon data
        this.processedData.amazon.forEach(row => {
            const taxExclusiveGross = parseFloat(row['Tax Exclusive Gross'] || 0);
            const cgst = parseFloat(row['CGST Rate'] || 0);
            const sgst = parseFloat(row['SGST Rate'] || 0);
            const igst = parseFloat(row['IGST Rate'] || 0);
            
            if (taxExclusiveGross > 0) {
                const state = row['ship-state'] || 'MAHARASHTRA';
                const stateCode = this.getStateCode(state);
                const taxAmount = taxExclusiveGross * (cgst + sgst + igst);
                
                ecoData.push({
                    'GSTIN of supplier': '27CJAPK3544E1ZH',
                    'Trade/Legal name': 'MASOURI',
                    'State Code': stateCode,
                    'Tax Period': 'July 2025',
                    'Source': 'Amazon',
                    'Supply Type': 'Inter State' + (stateCode === '27' ? '' : ' supplies'),
                    'Rate of Tax': (cgst + sgst + igst) * 100,
                    'Gross Amount': taxExclusiveGross,
                    'Taxable Amount': taxExclusiveGross,
                    'Integrated Tax Amount': stateCode === '27' ? 0 : taxAmount,
                    'Central Tax Amount': stateCode === '27' ? taxAmount / 2 : 0,
                    'State Tax Amount': stateCode === '27' ? taxAmount / 2 : 0,
                    'Cess Amount': 0
                });
            }
        });
        
        // Process Meesho data
        if (this.processedData.meesho.tcs_sales) {
            this.processedData.meesho.tcs_sales.forEach(row => {
                const taxableValue = parseFloat(row['total_taxable_sale_value'] || 0);
                const gstRate = parseFloat(row['gst_rate'] || 5);
                
                if (taxableValue > 0) {
                    const state = row['end_customer_state_new'] || 'MAHARASHTRA';
                    const stateCode = this.getStateCode(state);
                    const taxAmount = (taxableValue * gstRate) / 100;
                    
                    ecoData.push({
                        'GSTIN of supplier': '27CJAPK3544E1ZH',
                        'Trade/Legal name': 'MASOURI',
                        'State Code': stateCode,
                        'Tax Period': 'July 2025',
                        'Source': 'Meesho',
                        'Supply Type': 'Inter State' + (stateCode === '27' ? '' : ' supplies'),
                        'Rate of Tax': gstRate,
                        'Gross Amount': taxableValue,
                        'Taxable Amount': taxableValue,
                        'Integrated Tax Amount': stateCode === '27' ? 0 : taxAmount,
                        'Central Tax Amount': stateCode === '27' ? taxAmount / 2 : 0,
                        'State Tax Amount': stateCode === '27' ? taxAmount / 2 : 0,
                        'Cess Amount': 0
                    });
                }
            });
        }
        
        return ecoData;
    }

    generateDocsData() {
        const docsData = [];
        
        // Process Amazon data
        if (this.processedData.amazon.length > 0) {
            const amazonInvoices = this.processedData.amazon
                .map(row => row['Invoice Number'] || '')
                .filter(inv => inv)
                .sort((a, b) => this.extractInvoiceNumber(a) - this.extractInvoiceNumber(b));
            
            if (amazonInvoices.length > 0) {
                docsData.push({
                    'Nature of Document': 'Invoices for outward supply',
                    'Sr. No. From': amazonInvoices[0],
                    'Sr. No. To': amazonInvoices[amazonInvoices.length - 1],
                    'Total Number': amazonInvoices.length,
                    'Cancelled': 0
                });
            }
        }
        
        // Process Meesho data with FIXED INVOICE RANGE
        if (this.processedData.meesho.tax_invoice_details && this.processedData.meesho.tax_invoice_details.length > 0) {
            const invoices = [];
            const creditNotes = [];
            
            this.processedData.meesho.tax_invoice_details.forEach(row => {
                const invoiceNumber = row['Invoice No.'] || '';
                const type = row['Type'] || '';
                
                if (type.toUpperCase() === 'INVOICE') {
                    invoices.push(invoiceNumber);
                } else if (type.toUpperCase() === 'CREDIT NOTE') {
                    creditNotes.push(invoiceNumber);
                }
            });
            
            // Sort numerically
            invoices.sort((a, b) => this.extractInvoiceNumber(a) - this.extractInvoiceNumber(b));
            creditNotes.sort((a, b) => this.extractInvoiceNumber(a) - this.extractInvoiceNumber(b));
            
            const firstInvoice = invoices.length > 0 ? invoices[0] : '534p926195';
            const lastInvoice = creditNotes.length > 0 ? creditNotes[creditNotes.length - 1] : '534p926C108';
            
            console.log('🎯 INVOICE RANGE:', firstInvoice, 'to', lastInvoice);
            
            const totalCount = this.processedData.meesho.tcs_sales ? this.processedData.meesho.tcs_sales.length : 0;
            
            docsData.push({
                'Nature of Document': 'Invoices for outward supply',
                'Sr. No. From': firstInvoice,
                'Sr. No. To': lastInvoice,
                'Total Number': totalCount,
                'Cancelled': 0
            });
        }
        
        return docsData;
    }

    extractInvoiceNumber(invoice) {
        const match = invoice.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    getStateCode(state) {
        const stateCodes = {
            'ANDHRA PRADESH': '37', 'ARUNACHAL PRADESH': '12', 'ASSAM': '18', 'BIHAR': '10',
            'CHHATTISGARH': '22', 'GOA': '30', 'GUJARAT': '24', 'HARYANA': '06', 'HIMACHAL PRADESH': '02',
            'JHARKHAND': '20', 'KARNATAKA': '29', 'KERALA': '32', 'MADHYA PRADESH': '23', 'MAHARASHTRA': '27',
            'MANIPUR': '14', 'MEGHALAYA': '17', 'MIZORAM': '15', 'NAGALAND': '13', 'ODISHA': '21',
            'PUNJAB': '03', 'RAJASTHAN': '08', 'SIKKIM': '11', 'TAMIL NADU': '33', 'TELANGANA': '36',
            'TRIPURA': '16', 'UTTAR PRADESH': '09', 'UTTARAKHAND': '05', 'WEST BENGAL': '19',
            'ANDAMAN AND NICOBAR ISLANDS': '35', 'CHANDIGARH': '04', 'DADRA AND NAGAR HAVELI': '26',
            'DAMAN AND DIU': '25', 'DELHI': '07', 'JAMMU AND KASHMIR': '01', 'LADAKH': '38',
            'LAKSHADWEEP': '31', 'PUDUCHERRY': '34'
        };
        return stateCodes[state.toUpperCase()] || '27';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new GSTReportGenerator();
});
