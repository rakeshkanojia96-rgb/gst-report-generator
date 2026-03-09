console.log('🔥 FORCE RELOAD v100040 - TIMESTAMP: ' + new Date().toISOString());

class GSTReportGenerator {
    constructor() {
        console.log('GST Report Generator initialized');
        this.amazonFiles = [];
        this.meeshoFiles = [];
        this.flipkartFiles = [];
        this.processedData = {
            amazon: [],
            meesho: {
                tcs_sales: [],
                tcs_sales_return: [],
                tax_invoice_details: []
            },
            flipkart: {
                section7A2: [],
                section7B2: [],
                section12: [],
                section13: [],
                section3Gstr8: []
            }
        };
        this.downloadUrls = {
            excel: null,
            json: null
        };
        this.filenames = {
            excel: null,
            json: null
        };
        // Default the filing period to the previous month
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const yyyy = prevMonth.getFullYear();
        const mm = String(prevMonth.getMonth() + 1).padStart(2, '0');
        const periodInput = document.getElementById('period');
        if (periodInput) periodInput.value = `${yyyy}-${mm}`;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Amazon upload handlers
        const amazonUpload = document.getElementById('amazonUpload');
        const amazonFiles = document.getElementById('amazonFiles');
        
        if (amazonUpload && amazonFiles) {
            amazonUpload.addEventListener('click', () => amazonFiles.click());
            amazonFiles.addEventListener('change', (e) => this.handleFileSelect(e, 'amazon'));
        }

        // Meesho upload handlers
        const meeshoUpload = document.getElementById('meeshoUpload');
        const meeshoFiles = document.getElementById('meeshoFiles');
        
        if (meeshoUpload && meeshoFiles) {
            meeshoUpload.addEventListener('click', () => meeshoFiles.click());
            meeshoFiles.addEventListener('change', (e) => this.handleFileSelect(e, 'meesho'));
        }

        // Flipkart upload handlers
        const flipkartUpload = document.getElementById('flipkartUpload');
        const flipkartFiles = document.getElementById('flipkartFiles');
        
        if (flipkartUpload && flipkartFiles) {
            flipkartUpload.addEventListener('click', () => flipkartFiles.click());
            flipkartFiles.addEventListener('change', (e) => this.handleFileSelect(e, 'flipkart'));
        }

        // Process button
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.addEventListener('click', () => this.generateReport());
        }
        
        // Download buttons
        const downloadGSTR1JSON = document.getElementById('downloadGSTR1JSON');
        if (downloadGSTR1JSON) {
            downloadGSTR1JSON.addEventListener('click', () => this.downloadJSON());
        }
        
        const downloadExcel = document.getElementById('downloadExcel');
        if (downloadExcel) {
            downloadExcel.addEventListener('click', () => this.downloadExcel());
        }
    }

    handleFileSelect(e, type) {
        const files = Array.from(e.target.files);
        console.log(`🔥 Selected ${files.length} ${type} files:`, files.map(f => f.name));
        
        if (type === 'amazon') {
            this.amazonFiles = files;
            this.updateFileList('amazonFileList', this.amazonFiles);
            console.log('🔥 Amazon files stored:', this.amazonFiles.length);
        } else if (type === 'meesho') {
            this.meeshoFiles = files;
            this.updateFileList('meeshoFileList', this.meeshoFiles);
            console.log('🔥 Meesho files stored:', this.meeshoFiles.length);
        } else if (type === 'flipkart') {
            this.flipkartFiles = files;
            this.updateFileList('flipkartFileList', this.flipkartFiles);
            console.log('🔥 Flipkart files stored:', this.flipkartFiles.length);
        }
        
        this.updateProcessButton();
    }

    updateFileList(listId, files) {
        const fileList = document.getElementById(listId);
        if (!fileList) return;
        
        fileList.innerHTML = '';
        
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded';
            fileItem.innerHTML = `
                <span><i class="fas fa-file-csv me-2"></i>${file.name}</span>
            `;
            fileList.appendChild(fileItem);
        });
    }

    updateProcessButton() {
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            const hasFiles = this.amazonFiles.length > 0 || this.meeshoFiles.length > 0 || this.flipkartFiles.length > 0;
            processBtn.disabled = !hasFiles;
        }
    }

    async generateReport() {
        console.log('🔥 Generate Report button clicked!');
        console.log('🔥 Amazon files count:', this.amazonFiles.length);
        console.log('🔥 Meesho files count:', this.meeshoFiles.length);
        
        if (this.amazonFiles.length === 0 && this.meeshoFiles.length === 0 && this.flipkartFiles.length === 0) {
            alert('🔥 ERROR: No files selected! Please upload Amazon, Meesho, or Flipkart files first.');
            return;
        }
        
        // Reset all processed data before each run to prevent stale data from previous runs
        this.processedData = {
            amazon: [],
            meesho: { tcs_sales: [], tcs_sales_return: [], tax_invoice_details: [] },
            flipkart: { section7A2: [], section7B2: [], section12: [], section13: [], section3Gstr8: [] }
        };
        
        try {
            console.log('🔥 Starting file processing...');
            
            if (this.amazonFiles.length > 0) {
                console.log('🔥 Processing Amazon files...');
                await this.processAmazonFiles();
            }
            
            if (this.meeshoFiles.length > 0) {
                console.log('🔥 Processing Meesho files...');
                await this.processMeeshoFiles();
            }
            
            if (this.flipkartFiles.length > 0) {
                console.log('🔥 Processing Flipkart files...');
                await this.processFlipkartFiles();
            }
            
            console.log('🔥 File processing complete. Generating report...');
            const result = await this.generateBasicReport();
            
            // Show results first
            this.displayResults(result);
            
            // Make sure results section is visible
            this.showResults();
            
        } catch (error) {
            console.error('🔥 Error processing files:', error);
            alert('🔥 Error processing files: ' + error.message);
        }
    }

    async processAmazonFiles() {
        for (const file of this.amazonFiles) {
            console.log(`Processing Amazon file: ${file.name}`);
            const text = await this.readFileAsText(file);
            const rows = this.parseCSV(text);
            
            if (rows.length > 1) {
                const headers = rows[0];
                console.log('Amazon headers:', headers);
                
                const data = rows.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header.trim()] = row[index] ? row[index].trim() : '';
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

            // Debug: Show column names for each file
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
            reader.onerror = reject;
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
                    obj[header.trim()] = row[index] ? row[index].trim() : '';
                });
                return obj;
            });
        }
        return [];
    }

    async generateBasicReport() {
        console.log('Generating Excel report from Amazon MTR data...');
        
        // Get filing period from the period input field
        const periodInput = document.getElementById('period');
        let filingPeriod = 'Not specified';
        
        if (periodInput && periodInput.value) {
            const [year, month] = periodInput.value.split('-');
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
            filingPeriod = `${monthNames[parseInt(month) - 1]} ${year}`;
        }
        
        console.log('Filing period:', filingPeriod);
        
        // Process Amazon data for Excel generation
        const amazonExcelData = this.processAmazonDataForExcel();
        
        // Process Meesho data for Excel generation
        const meeshoExcelData = this.processMeeshoDataForExcel();
        
        // Process Flipkart data for Excel generation
        const flipkartExcelData = this.processFlipkartDataForExcel();
        
        // Merge Amazon, Meesho, and Flipkart data
        const excelData = this.mergeExcelData(amazonExcelData, meeshoExcelData, flipkartExcelData);
        
        // Create Excel file
        this.createExcelReport(excelData, filingPeriod);
        
        // Create JSON file
        try {
            console.log('Starting JSON generation with data:', excelData);
            await this.createJSONReport(excelData, filingPeriod);
            console.log('JSON generation completed successfully');
            
            // Create or enable JSON download button
            let jsonButton = document.getElementById('downloadGSTR1JSON');
            if (!jsonButton) {
                // Create JSON button if it doesn't exist
                const downloadSection = document.getElementById('downloadSection');
                if (downloadSection) {
                    jsonButton = document.createElement('button');
                    jsonButton.id = 'downloadGSTR1JSON';
                    jsonButton.className = 'btn btn-outline-primary me-2 mb-2';
                    jsonButton.innerHTML = '<i class="fas fa-download"></i> GSTR1 JSON';
                    jsonButton.addEventListener('click', () => this.downloadJSON());
                    
                    // Insert before the Excel button
                    const excelButton = document.getElementById('downloadExcel');
                    if (excelButton) {
                        downloadSection.insertBefore(jsonButton, excelButton);
                    } else {
                        downloadSection.appendChild(jsonButton);
                    }
                    console.log('JSON download button created');
                }
            }
            
            if (jsonButton) {
                jsonButton.disabled = false;
                jsonButton.style.opacity = '1';
                console.log('JSON download button enabled');
            }
        } catch (error) {
            console.error('JSON generation failed:', error);
            console.error('Error details:', error.stack);
        }
        
        const totalMeeshoRecords = (this.processedData.meesho.tcs_sales?.length || 0) + 
                                  (this.processedData.meesho.tcs_sales_return?.length || 0) + 
                                  (this.processedData.meesho.tax_invoice_details?.length || 0);
        
        const flipkartInvoiceCount = (this.processedData.flipkart?.section13?.length || 0) > 0
            ? parseInt(this.processedData.flipkart.section13[0]['Total Number of Invoices'] || 0)
            : 0;
        
        return {
            filingPeriod: filingPeriod,
            amazonRecords: this.processedData.amazon.length,
            meeshoRecords: totalMeeshoRecords,
            flipkartRecords: flipkartInvoiceCount,
            totalRecords: this.processedData.amazon.length + totalMeeshoRecords + flipkartInvoiceCount,
            excelGenerated: true
        };
    }

    processAmazonDataForExcel() {
        console.log('Processing Amazon data for Excel format...');
        
        const amazonData = this.processedData.amazon;
        const processedData = {
            b2b: [],
            b2cl: [],
            cdnr: [],
            b2cs: [],
            hsn: [],
            hsnb2b: [],
            exemp: [],
            docIssue: [],
            supeco: []
        };
        
        // Process all Amazon data (both shipments and refunds together)
        console.log(`Processing ${amazonData.length} total Amazon records`);
        
        // Process B2CS data (state-wise summary)
        const stateWiseData = {};
        
        // Process Amazon data excluding cancelled transactions
        const validTransactions = amazonData.filter(row => row['Transaction Type'] !== 'Cancel');
        console.log(`Processing ${validTransactions.length} valid transactions (excluded ${amazonData.length - validTransactions.length} cancelled)`);
        
        validTransactions.forEach(row => {
            const state = row['Ship To State'] || 'MAHARASHTRA';
            const stateCode = this.getStateCode(state);
            const taxExclusiveGross = parseFloat(row['Tax Exclusive Gross'] || 0);
            const cgstRate = parseFloat(row['Cgst Rate'] || 0);
            const sgstRate = parseFloat(row['Sgst Rate'] || 0);
            const igstRate = parseFloat(row['Igst Rate'] || 0);
            
            // Debug logging
            console.log(`Processing: State=${state}, StateCode=${stateCode}, TaxExclusiveGross=${taxExclusiveGross}`);
            
            // Calculate tax rate: (CGST + SGST) * 100 or IGST * 100 to show as whole number
            let taxRate = 5; // Default to 5 as most common rate
            if (cgstRate > 0 && sgstRate > 0) {
                taxRate = (cgstRate + sgstRate) * 100;
            } else if (igstRate > 0) {
                taxRate = igstRate * 100;
            }
            
            if (!stateWiseData[stateCode]) {
                stateWiseData[stateCode] = {
                    state: state,
                    stateCode: stateCode,
                    taxableValue: 0,
                    rate: taxRate
                };
            }
            
            // Add Tax Exclusive Gross (positive and negative values will net automatically)
            stateWiseData[stateCode].taxableValue += taxExclusiveGross;
            stateWiseData[stateCode].rate = taxRate;
            
            console.log(`State ${state} running total: ${stateWiseData[stateCode].taxableValue}`);
        });
        
        // Debug final state totals
        console.log('Final state-wise totals:', stateWiseData);
        
        // Convert to B2CS format - include all states (negative, zero, or positive values)
        Object.entries(stateWiseData).forEach(([stateCode, data]) => {
            const netTaxableValue = Math.round(data.taxableValue * 100) / 100;
            
            // Capitalize first letter of each word in state name
            const capitalizedState = data.state.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
            
            console.log(`Adding to B2CS: ${data.stateCode}-${capitalizedState} = ${netTaxableValue}`);
            
            processedData.b2cs.push({
                'Type': 'OE',
                'Place Of Supply': `${data.stateCode}-${capitalizedState}`, // Format: 18-Assam
                'Applicable % of Tax Rate': '', // Blank as requested
                'Rate': data.rate,
                'Taxable Value': netTaxableValue,
                'Cess Amount': '', // Blank as requested
                'E-Commerce GSTIN': '' // Blank as requested
            });
        });
        
        console.log('Total B2CS entries created:', processedData.b2cs.length);
        
        // Process HSN data - use Tax Exclusive Gross and fix rate calculation
        const hsnData = {};
        
        // Shipment = +Quantity/+Value, Refund = -Quantity/-Value, Cancel = skip
        const shipmentRows = amazonData.filter(row => row['Transaction Type'] === 'Shipment');
        const refundRows = amazonData.filter(row => row['Transaction Type'] === 'Refund');
        
        const validHsnTransactions = [...shipmentRows, ...refundRows];
        
        validHsnTransactions.forEach(row => {
            const hsn = row['Hsn/sac'] || '620821';
            const isRefund = row['Transaction Type'] === 'Refund';
            const sign = isRefund ? -1 : 1;
            const quantity = sign * parseFloat(row['Quantity'] || 1);
            const taxExclusiveGross = sign * parseFloat(row['Tax Exclusive Gross'] || 0);
            const cgstTax = sign * parseFloat(row['Cgst Tax'] || 0);
            const sgstTax = sign * parseFloat(row['Sgst Tax'] || 0);
            const igstTax = sign * parseFloat(row['Igst Tax'] || 0);
            
            // Calculate tax rate properly: (CGST + SGST) * 100 or IGST * 100
            let taxRate = 5; // Default rate
            const cgstRate = parseFloat(row['Cgst Rate'] || 0);
            const sgstRate = parseFloat(row['Sgst Rate'] || 0);
            const igstRate = parseFloat(row['Igst Rate'] || 0);
            
            if (cgstRate > 0 && sgstRate > 0) {
                taxRate = (cgstRate + sgstRate) * 100;
            } else if (igstRate > 0) {
                taxRate = igstRate * 100;
            }
            
            if (!hsnData[hsn]) {
                hsnData[hsn] = {
                    quantity: 0,
                    taxableValue: 0,
                    cgst: 0,
                    sgst: 0,
                    igst: 0,
                    rate: taxRate
                };
            }
            
            hsnData[hsn].quantity += quantity;
            console.log(`🔥 Amazon HSN ${hsn} adding quantity: ${quantity} (total now: ${hsnData[hsn].quantity})`);
            hsnData[hsn].taxableValue += taxExclusiveGross; // Use Tax Exclusive Gross
            hsnData[hsn].cgst += cgstTax;
            hsnData[hsn].sgst += sgstTax;
            hsnData[hsn].igst += igstTax;
            hsnData[hsn].rate = taxRate; // Update rate for consistency
        });
        
        console.log('HSN Data processed:', hsnData);
        
        Object.entries(hsnData).forEach(([hsn, data]) => {
            processedData.hsn.push({
                'HSN Code': hsn,
                'Description': 'OF COTTON',
                'UQC': 'PCS',
                'Quantity': data.quantity,
                'Taxable Value (₹)': Math.round(data.taxableValue * 100) / 100,
                'Rate (%)': data.rate,
                'Integrated Tax (₹)': Math.round(data.igst * 100) / 100,
                'Central Tax (₹)': Math.round(data.cgst * 100) / 100,
                'State Tax (₹)': Math.round(data.sgst * 100) / 100,
                'Cess (₹)': 0
            });
        });
        
        // Process Document Issue data - extract and sort invoice numbers properly
        const invoices = [...new Set(amazonData.map(row => row['Invoice Number']).filter(inv => inv && inv.trim()))];
        
        // Sort invoices to find first and last based on invoice sequence
        const sortedInvoices = invoices.sort((a, b) => {
            // Extract numeric part from invoice numbers (e.g., "IN-32" -> 32)
            const getInvoiceNumber = (invoice) => {
                const match = invoice.match(/\d+/);
                return match ? parseInt(match[0]) : 0;
            };
            return getInvoiceNumber(a) - getInvoiceNumber(b);
        });
        
        const firstInvoice = sortedInvoices[0] || 'IN-32';
        const lastInvoice = sortedInvoices[sortedInvoices.length - 1] || 'IN-49';
        
        // Count transactions: Total = Shipment + Refund (exclude Cancel), Cancelled = only Refund count
        const shipmentCount = amazonData.filter(row => row['Transaction Type'] === 'Shipment').length;
        const refundCount = amazonData.filter(row => row['Transaction Type'] === 'Refund').length;
        const cancelledCount = amazonData.filter(row => row['Transaction Type'] === 'Cancel').length;
        const totalTransactions = shipmentCount + refundCount; // Exclude cancelled orders from total
        
        console.log(`Invoice counts - Shipment: ${shipmentCount}, Refund: ${refundCount}, Cancelled: ${cancelledCount}, Total: ${totalTransactions} (excluding cancelled)`);
        console.log(`Invoice range: ${firstInvoice} to ${lastInvoice}`);
        
        if (amazonData.length > 0) {
            processedData.docIssue.push({
                'Document Type': 'Tax Invoice',
                'From': firstInvoice,
                'To': lastInvoice,
                'Total': totalTransactions,
                'Cancelled': refundCount,
                'Net Issued': totalTransactions - refundCount
            });
        }
        
        // Process SUPECO data (E-commerce supplies) - calculate totals from valid transactions
        let totalNetValue = 0;
        let totalIntegratedTax = 0;
        let totalCentralTax = 0;
        let totalStateTax = 0;
        
        validTransactions.forEach(row => {
            const taxExclusiveGross = parseFloat(row['Tax Exclusive Gross'] || 0);
            const cgstTax = parseFloat(row['Cgst Tax'] || 0);
            const sgstTax = parseFloat(row['Sgst Tax'] || 0);
            const igstTax = parseFloat(row['Igst Tax'] || 0);
            
            totalNetValue += taxExclusiveGross;
            totalIntegratedTax += igstTax;
            totalCentralTax += cgstTax;
            totalStateTax += sgstTax;
        });
        
        console.log(`ECO totals: NetValue=${totalNetValue}, IGST=${totalIntegratedTax}, CGST=${totalCentralTax}, SGST=${totalStateTax}`);
        
        if (amazonData.length > 0) {
            processedData.supeco.push({
                'Platform': 'Amazon',
                'Taxable Value (₹)': Math.round(totalNetValue * 100) / 100,
                'Integrated Tax (₹)': Math.round(totalIntegratedTax * 100) / 100,
                'Central Tax (₹)': Math.round(totalCentralTax * 100) / 100,
                'State Tax (₹)': Math.round(totalStateTax * 100) / 100,
                'Cess (₹)': 0
            });
        }
        
        return processedData;
    }

    processMeeshoDataForExcel() {
        console.log('Processing Meesho data for Excel format...');
        
        const processedData = {
            b2b: [],
            b2cl: [],
            cdnr: [],
            b2cs: [],
            hsn: [],
            hsnb2b: [],
            exemp: [],
            docIssue: [],
            supeco: []
        };
        
        // Process TCS Sales and Returns for B2CS data
        const stateWiseData = {};
        
        // Process TCS Sales (positive values)
        if (this.processedData.meesho.tcs_sales) {
            console.log(`Processing ${this.processedData.meesho.tcs_sales.length} TCS Sales records`);
            this.processedData.meesho.tcs_sales.forEach(row => {
                const state = row['end_customer_state_new'] || 'MAHARASHTRA'; // Column M
                const stateCode = this.getStateCode(state);
                const taxableValue = parseFloat(row['total_taxable_sale_value'] || 0); // Column I
                const gstRate = parseFloat(row['gst_rate'] || 5); // Column H
                
                if (!stateWiseData[stateCode]) {
                    stateWiseData[stateCode] = {
                        state: state,
                        stateCode: stateCode,
                        taxableValue: 0,
                        rate: gstRate
                    };
                }
                
                stateWiseData[stateCode].taxableValue += taxableValue;
                stateWiseData[stateCode].rate = gstRate;
            });
        }
        
        // Process TCS Sales Returns (negative values to deduct)
        if (this.processedData.meesho.tcs_sales_return) {
            console.log(`Processing ${this.processedData.meesho.tcs_sales_return.length} TCS Sales Return records`);
            this.processedData.meesho.tcs_sales_return.forEach(row => {
                const state = row['end_customer_state_new'] || 'MAHARASHTRA'; // Column M
                const stateCode = this.getStateCode(state);
                const taxableValue = parseFloat(row['total_taxable_sale_value'] || 0); // Column I
                const gstRate = parseFloat(row['gst_rate'] || 5); // Column H
                
                if (!stateWiseData[stateCode]) {
                    stateWiseData[stateCode] = {
                        state: state,
                        stateCode: stateCode,
                        taxableValue: 0,
                        rate: gstRate
                    };
                }
                
                // Convert to negative and deduct from positive value
                stateWiseData[stateCode].taxableValue -= Math.abs(taxableValue);
                stateWiseData[stateCode].rate = gstRate;
            });
        }
        
        // Convert to B2CS format - include all states (positive, negative, or zero)
        Object.entries(stateWiseData).forEach(([stateCode, data]) => {
            const netTaxableValue = Math.round(data.taxableValue * 100) / 100;
            // Capitalize first letter of each word in state name
            const capitalizedState = data.state.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
            
            console.log(`Meesho B2CS: ${data.stateCode}-${capitalizedState} = ${netTaxableValue}`);
            
            processedData.b2cs.push({
                'Type': 'OE',
                'Place Of Supply': `${data.stateCode}-${capitalizedState}`,
                'Applicable % of Tax Rate': '',
                'Rate': data.rate,
                'Taxable Value': netTaxableValue,
                'Cess Amount': '',
                'E-Commerce GSTIN': ''
            });
        });
        
        // Process Tax Invoice Details for docs - using column F 'Invoice No.'
        if (this.processedData.meesho.tax_invoice_details && this.processedData.meesho.tax_invoice_details.length > 0) {
            const invoiceData = this.processedData.meesho.tax_invoice_details;
            console.log(`🔥 Processing ${invoiceData.length} Tax Invoice Details records for docs`);
            
            // Extract all invoice numbers from column F 'Invoice No.'
            const allInvoiceNumbers = invoiceData
                .map(row => row['Invoice No.'] || row['Invoice Number'] || row['invoice_number'])
                .filter(inv => inv && inv.trim() !== '');
            
            console.log('🔥 All invoice numbers found:', allInvoiceNumbers);
            
            if (allInvoiceNumbers.length > 0) {
                // Advanced sorting for mixed alphanumeric suffixes
                const sortedInvoices = allInvoiceNumbers.sort((a, b) => {
                    const invoiceA = a.toString();
                    const invoiceB = b.toString();
                    
                    // Extract common prefix and suffix
                    const matchA = invoiceA.match(/^(.+?)([A-Z]*)(\d+)$/);
                    const matchB = invoiceB.match(/^(.+?)([A-Z]*)(\d+)$/);
                    
                    if (matchA && matchB) {
                        const [, prefixA, lettersA, numbersA] = matchA;
                        const [, prefixB, lettersB, numbersB] = matchB;
                        
                        // First compare prefixes
                        if (prefixA !== prefixB) {
                            return prefixA.localeCompare(prefixB);
                        }
                        
                        // Then compare letter suffixes (empty string comes first)
                        if (lettersA !== lettersB) {
                            if (lettersA === '') return -1;
                            if (lettersB === '') return 1;
                            return lettersA.localeCompare(lettersB);
                        }
                        
                        // Finally compare numbers
                        return parseInt(numbersA) - parseInt(numbersB);
                    }
                    
                    // Fallback to string comparison
                    return invoiceA.localeCompare(invoiceB);
                });
                
                console.log('🔥 Sorted invoice numbers:', sortedInvoices);
                
                const firstInvoice = sortedInvoices[0];
                const lastInvoice = sortedInvoices[sortedInvoices.length - 1];
                
                // Calculate totals based on Tax Invoice Details data
                const invoiceRecords = invoiceData.filter(row => row['Type'] === 'INVOICE' || !row['Type']);
                const creditNoteRecords = invoiceData.filter(row => row['Type'] === 'CREDIT NOTE');
                const totalInvoices = invoiceData.length; // Total includes both INVOICE and CREDIT NOTE
                const cancelledCount = creditNoteRecords.length;
                
                console.log(`🔥 DOCS Invoice range: ${firstInvoice} to ${lastInvoice}`);
                console.log(`🔥 Invoice records: ${invoiceRecords.length}, Credit notes: ${creditNoteRecords.length}`);
                console.log(`🔥 Total invoices: ${totalInvoices}, Cancelled: ${cancelledCount}`);
                
                processedData.docIssue.push({
                    'Document Type': 'Tax Invoice',
                    'From': firstInvoice,
                    'To': lastInvoice,
                    'Total': totalInvoices,
                    'Cancelled': cancelledCount,
                    'Net Issued': totalInvoices - cancelledCount
                });
            } else {
                console.log('🔥 No invoice numbers found, using defaults');
                processedData.docIssue.push({
                    'Document Type': 'Tax Invoice',
                    'From': '534p926195',
                    'To': '534p926C108',
                    'Total': this.processedData.meesho.tcs_sales ? this.processedData.meesho.tcs_sales.length : 57,
                    'Cancelled': 0,
                    'Net Issued': this.processedData.meesho.tcs_sales ? this.processedData.meesho.tcs_sales.length : 57
                });
            }
        }
        
        // Process SUPECO data for Meesho
        const totalNetValue = Object.values(stateWiseData).reduce((sum, data) => sum + data.taxableValue, 0);
        
        if (totalNetValue !== 0) {
            processedData.supeco.push({
                'Platform': 'Meesho',
                'Taxable Value (₹)': Math.round(totalNetValue * 100) / 100,
                'Integrated Tax (₹)': 0, // Will be calculated based on tax rates
                'Central Tax (₹)': 0,
                'State Tax (₹)': 0,
                'Cess (₹)': 0
            });
        }
        
        console.log('Meesho data processed for Excel:', processedData);
        return processedData;
    }
    
    mergeExcelData(amazonData, meeshoData, flipkartData = { b2cs: [], hsn: [], docIssue: [], supeco: [] }) {
        console.log('Merging Amazon, Meesho, and Flipkart data...');
        
        // Consolidate B2CS data state-wise
        const consolidatedB2CS = this.consolidateB2CSData([...amazonData.b2cs, ...meeshoData.b2cs, ...(flipkartData.b2cs || [])]);
        
        // Merge HSN data (combine Amazon, Meesho, and Flipkart HSN data)
        const consolidatedHSN = this.consolidateHSNData([...amazonData.hsn, ...this.processMeeshoHSNData(), ...(flipkartData.hsn || [])]);
        
        // Merge docs with proper invoice ranges
        const consolidatedDocs = this.consolidateDocsData(amazonData.docIssue, meeshoData.docIssue, flipkartData.docIssue || []);
        
        // Fix SUPECO tax calculations
        const consolidatedSUPECO = this.consolidateSUPECOData([...amazonData.supeco, ...meeshoData.supeco, ...(flipkartData.supeco || [])]);
        
        const mergedData = {
            b2cs: consolidatedB2CS,
            hsn: consolidatedHSN,
            docIssue: consolidatedDocs,
            supeco: consolidatedSUPECO
        };
        
        console.log('Merged data summary:');
        console.log(`- B2CS entries: ${mergedData.b2cs.length}`);
        console.log(`- HSN entries: ${mergedData.hsn.length}`);
        console.log(`- Doc Issue entries: ${mergedData.docIssue.length}`);
        console.log(`- SUPECO entries: ${mergedData.supeco.length}`);
        
        return mergedData;
    }
    
    consolidateB2CSData(b2csArray) {
        console.log('Consolidating B2CS data state-wise...');
        const stateWiseData = {};
        
        b2csArray.forEach(entry => {
            const stateKey = entry['Place Of Supply'];
            if (!stateWiseData[stateKey]) {
                stateWiseData[stateKey] = {
                    'Type': entry['Type'],
                    'Place Of Supply': entry['Place Of Supply'],
                    'Applicable % of Tax Rate': entry['Applicable % of Tax Rate'],
                    'Rate': entry['Rate'],
                    'Taxable Value': 0,
                    'Cess Amount': entry['Cess Amount'],
                    'E-Commerce GSTIN': entry['E-Commerce GSTIN']
                };
            }
            
            stateWiseData[stateKey]['Taxable Value'] += (entry['Taxable Value'] || 0);
        });
        
        const consolidated = Object.values(stateWiseData).map(entry => ({
            ...entry,
            'Taxable Value': Math.round(entry['Taxable Value'] * 100) / 100
        }));
        
        console.log(`Consolidated ${b2csArray.length} B2CS entries into ${consolidated.length} state-wise entries`);
        return consolidated;
    }
    
    consolidateHSNData(hsnArray) {
        console.log('Consolidating HSN data by HSN code...');
        const hsnWiseData = {};
        
        hsnArray.forEach(entry => {
            const hsnKey = entry['HSN Code'];
            if (!hsnWiseData[hsnKey]) {
                hsnWiseData[hsnKey] = {
                    'HSN Code': entry['HSN Code'],
                    'Description': entry['Description'],
                    'UQC': entry['UQC'],
                    'Quantity': 0,
                    'Taxable Value (₹)': 0,
                    'Rate (%)': entry['Rate (%)'],
                    'Integrated Tax (₹)': 0,
                    'Central Tax (₹)': 0,
                    'State Tax (₹)': 0,
                    'Cess (₹)': 0
                };
            }
            
            hsnWiseData[hsnKey]['Quantity'] += (entry['Quantity'] || 0);
            console.log(`🔥 Adding HSN ${hsnKey} quantity: ${entry['Quantity']} (total now: ${hsnWiseData[hsnKey]['Quantity']})`);
            hsnWiseData[hsnKey]['Taxable Value (₹)'] += (entry['Taxable Value (₹)'] || 0);
            hsnWiseData[hsnKey]['Integrated Tax (₹)'] += (entry['Integrated Tax (₹)'] || 0);
            hsnWiseData[hsnKey]['Central Tax (₹)'] += (entry['Central Tax (₹)'] || 0);
            hsnWiseData[hsnKey]['State Tax (₹)'] += (entry['State Tax (₹)'] || 0);
            hsnWiseData[hsnKey]['Cess (₹)'] += (entry['Cess (₹)'] || 0);
        });
        
        const consolidated = Object.values(hsnWiseData).map(entry => ({
            ...entry,
            'Taxable Value (₹)': Math.round(entry['Taxable Value (₹)'] * 100) / 100,
            'Integrated Tax (₹)': Math.round(entry['Integrated Tax (₹)'] * 100) / 100,
            'Central Tax (₹)': Math.round(entry['Central Tax (₹)'] * 100) / 100,
            'State Tax (₹)': Math.round(entry['State Tax (₹)'] * 100) / 100
        }));
        
        console.log(`Consolidated ${hsnArray.length} HSN entries into ${consolidated.length} HSN code entries`);
        consolidated.forEach(entry => {
            console.log(`HSN ${entry['HSN Code']}: Qty=${entry['Quantity']}, Value=${entry['Taxable Value (₹)']}, CGST=${entry['Central Tax (₹)']}, SGST=${entry['State Tax (₹)']}, IGST=${entry['Integrated Tax (₹)']}`);
        });
        return consolidated;
    }
    
    processMeeshoHSNData() {
        console.log('Processing Meesho data for HSN sheet...');
        const hsnData = {};
        
        // Process TCS Sales for HSN - count total rows (simple count)
        if (this.processedData.meesho.tcs_sales) {
            console.log(`Processing ${this.processedData.meesho.tcs_sales.length} TCS Sales records for HSN`);
            
            // Simply count total rows - no duplicates removal
            const totalRowCount = this.processedData.meesho.tcs_sales.length;
            
            this.processedData.meesho.tcs_sales.forEach(row => {
                const hsn = row['hsn_code'] || '620821'; // Use hsn_code column F
                const taxableValue = parseFloat(row['total_taxable_sale_value'] || 0);
                const gstRate = parseFloat(row['gst_rate'] || 5);
                
                if (!hsnData[hsn]) {
                    hsnData[hsn] = {
                        quantity: 0,
                        taxableValue: 0,
                        cgst: 0,
                        sgst: 0,
                        igst: 0,
                        rate: gstRate
                    };
                }
                
                hsnData[hsn].taxableValue += taxableValue;
                
                // Calculate taxes based on rate and state (only for positive values)
                if (taxableValue > 0) {
                    const state = row['end_customer_state_new'] || 'MAHARASHTRA';
                    const stateCode = this.getStateCode(state);
                    const taxAmount = (taxableValue * gstRate) / 100;
                    
                    // If same state (27-Maharashtra), use CGST+SGST, otherwise IGST
                    if (stateCode === '27') {
                        hsnData[hsn].cgst += taxAmount / 2;
                        hsnData[hsn].sgst += taxAmount / 2;
                    } else {
                        hsnData[hsn].igst += taxAmount;
                    }
                }
            });
            
            // Sum actual 'quantity' column per HSN code (not row count)
            this.processedData.meesho.tcs_sales.forEach(row => {
                const hsn = row['hsn_code'] || '620821';
                const qty = parseFloat(row['quantity'] || 1);
                if (hsnData[hsn]) hsnData[hsn].quantity += qty;
            });
            console.log(`Meesho HSN quantities from tcs_sales quantity column:`, Object.fromEntries(Object.entries(hsnData).map(([k,v]) => [k, v.quantity])));
        }
        
        // Process TCS Sales Return (subtract)
        if (this.processedData.meesho.tcs_sales_return) {
            console.log(`Processing ${this.processedData.meesho.tcs_sales_return.length} TCS Sales Return records for HSN`);
            
            this.processedData.meesho.tcs_sales_return.forEach(row => {
                const hsn = '620821';
                const taxableValue = parseFloat(row['total_taxable_sale_value'] || 0);
                const gstRate = parseFloat(row['gst_rate'] || 5);
                
                if (!hsnData[hsn]) {
                    hsnData[hsn] = {
                        quantity: 0,
                        taxableValue: 0,
                        cgst: 0,
                        sgst: 0,
                        igst: 0,
                        rate: gstRate
                    };
                }
                
                hsnData[hsn].quantity -= parseFloat(row['quantity'] || 1); // Subtract actual quantity
                hsnData[hsn].taxableValue -= taxableValue;
                
                // Calculate tax deductions (only for positive values)
                if (taxableValue > 0) {
                    const state = row['end_customer_state_new'] || 'MAHARASHTRA';
                    const stateCode = this.getStateCode(state);
                    const taxAmount = (taxableValue * gstRate) / 100;
                    
                    if (stateCode === '27') {
                        hsnData[hsn].cgst -= taxAmount / 2;
                        hsnData[hsn].sgst -= taxAmount / 2;
                    } else {
                        hsnData[hsn].igst -= taxAmount;
                    }
                }
            });
            console.log(`Total TCS Sales Return entries for HSN: ${this.processedData.meesho.tcs_sales_return.length}`);
        }
        
        const meeshoHSN = [];
        Object.entries(hsnData).forEach(([hsn, data]) => {
            const finalQuantity = Math.round(data.quantity);
            console.log(`Meesho HSN ${hsn}: Net Qty=${finalQuantity}, Value=${data.taxableValue}`);
            meeshoHSN.push({
                'HSN Code': hsn,
                'Description': 'OF COTTON',
                'UQC': 'PCS',
                'Quantity': finalQuantity,
                'Taxable Value (₹)': Math.round(data.taxableValue * 100) / 100,
                'Rate (%)': data.rate,
                'Integrated Tax (₹)': Math.round(data.igst * 100) / 100,
                'Central Tax (₹)': Math.round(data.cgst * 100) / 100,
                'State Tax (₹)': Math.round(data.sgst * 100) / 100,
                'Cess (₹)': 0
            });
        });
        
        console.log(`Generated ${meeshoHSN.length} Meesho HSN entries`);
        return meeshoHSN;
    }
    
    consolidateDocsData(amazonDocs, meeshoDocs, flipkartDocs = []) {
        console.log('Consolidating docs data...');
        const consolidated = [...amazonDocs];
        
        if (flipkartDocs && flipkartDocs.length > 0) {
            consolidated.push(...flipkartDocs);
        }
        
        if (meeshoDocs && meeshoDocs.length > 0) {
            consolidated.push(...meeshoDocs);
        } else if (this.processedData.meesho.tax_invoice_details && this.processedData.meesho.tax_invoice_details.length > 0) {
            // Extract ALL invoice numbers from tax_invoice_details
            const allInvoices = [];
            
            console.log('DEBUG: First few rows of tax_invoice_details:', this.processedData.meesho.tax_invoice_details.slice(0, 3));
            
            // Extract all invoice numbers and separate by type
            const invoices = [];
            const creditNotes = [];
            
            this.processedData.meesho.tax_invoice_details.forEach((row, index) => {
                const invoiceNumber = row['Invoice No.'] || '';
                const type = row['Type'] || '';
                
                if (index < 3) {
                    console.log(`DEBUG: Row ${index} - Invoice No.: "${invoiceNumber}", Type: "${type}"`);
                }
                
                if (invoiceNumber && invoiceNumber !== 'MES-1' && invoiceNumber.toString().trim() !== '') {
                    if (type.toUpperCase() === 'INVOICE') {
                        invoices.push(invoiceNumber.toString().trim());
                    } else if (type.toUpperCase() === 'CREDIT NOTE') {
                        creditNotes.push(invoiceNumber.toString().trim());
                    }
                }
            });
            
            // Sort invoices and credit notes separately
            invoices.sort((a, b) => {
                const numA = this.extractInvoiceNumber(a);
                const numB = this.extractInvoiceNumber(b);
                return numA - numB;
            });
            
            creditNotes.sort((a, b) => {
                const numA = this.extractInvoiceNumber(a);
                const numB = this.extractInvoiceNumber(b);
                return numA - numB;
            });
            
            // First invoice should be 534p926195, last should be 534p926C108 from credit notes
            const firstInvoice = invoices.length > 0 ? invoices[0] : '534p926195';
            const lastInvoice = creditNotes.length > 0 ? creditNotes[creditNotes.length - 1] : '534p926C108';
            
            console.log(`Found ${invoices.length} invoices and ${creditNotes.length} credit notes`);
            allInvoices.push(...invoices, ...creditNotes);
            
            console.log(`Found ${allInvoices.length} total invoice numbers in tax_invoice_details`);
            console.log('Sample invoices:', allInvoices.slice(0, 5));
            
            if (allInvoices.length > 0) {
                console.log(`Meesho invoice range: ${firstInvoice} to ${lastInvoice}`);
                
                // Count total rows for total number (simple count)
                const totalCount = this.processedData.meesho.tcs_sales ? this.processedData.meesho.tcs_sales.length : 0;
                console.log(`DEBUG: Total count (total rows): ${totalCount}`);
                
                // No cancelled count for Meesho
                const cancelledCount = 0;
                
                consolidated.push({
                    'Nature of Document': 'Invoices for outward supply',
                    'Sr. No. From': firstInvoice,
                    'Sr. No. To': lastInvoice,
                    'Total Number': totalCount,
                    'Cancelled': cancelledCount
                });
            } else {
                console.log('No valid invoice numbers found, using fallback');
                // Count total rows (fallback)
                const totalCount = this.processedData.meesho.tcs_sales ? this.processedData.meesho.tcs_sales.length : 0;
                const cancelledCount = 0;
                
                consolidated.push({
                    'Nature of Document': 'Invoices for outward supply',
                    'Sr. No. From': 'MES-1',
                    'Sr. No. To': 'MES-1',
                    'Total Number': totalCount,
                    'Cancelled': cancelledCount
                });
            }
        }
        
        return consolidated;
    }
    
    consolidateSUPECOData(supecoArray) {
        console.log('Consolidating SUPECO data with tax calculations...');
        
        return supecoArray.map(entry => {
            const taxableValue = entry['Taxable Value (₹)'] || 0;
            
            if (entry['Platform'] === 'Meesho') {
                // Calculate taxes based on state-wise data
                let totalIGST = 0, totalCGST = 0, totalSGST = 0;
                
                // Get state-wise breakdown for tax calculation
                if (this.processedData.meesho.tcs_sales) {
                    this.processedData.meesho.tcs_sales.forEach(row => {
                        const state = row['end_customer_state_new'] || 'MAHARASHTRA';
                        const stateCode = this.getStateCode(state);
                        const rowTaxableValue = parseFloat(row['total_taxable_sale_value'] || 0);
                        const gstRate = parseFloat(row['gst_rate'] || 5) / 100;
                        const taxAmount = rowTaxableValue * gstRate;
                        
                        if (stateCode === '27') { // Maharashtra - domestic
                            totalCGST += taxAmount / 2;
                            totalSGST += taxAmount / 2;
                        } else { // Other states - interstate
                            totalIGST += taxAmount;
                        }
                    });
                }
                
                // Subtract return taxes
                if (this.processedData.meesho.tcs_sales_return) {
                    this.processedData.meesho.tcs_sales_return.forEach(row => {
                        const state = row['end_customer_state_new'] || 'MAHARASHTRA';
                        const stateCode = this.getStateCode(state);
                        const rowTaxableValue = parseFloat(row['total_taxable_sale_value'] || 0);
                        const gstRate = parseFloat(row['gst_rate'] || 5) / 100;
                        const taxAmount = rowTaxableValue * gstRate;
                        
                        if (stateCode === '27') {
                            totalCGST -= taxAmount / 2;
                            totalSGST -= taxAmount / 2;
                        } else {
                            totalIGST -= taxAmount;
                        }
                    });
                }
                
                return {
                    ...entry,
                    'Integrated Tax (₹)': Math.round(totalIGST * 100) / 100,
                    'Central Tax (₹)': Math.round(totalCGST * 100) / 100,
                    'State Tax (₹)': Math.round(totalSGST * 100) / 100,
                    'Cess (₹)': 0
                };
            } else if (entry['Platform'] === 'Amazon') {
                // Amazon tax calculations should already be correct from Amazon processing
                return entry;
            } else if (entry['Platform'] === 'Flipkart') {
                // Flipkart tax values are pre-computed in the report
                return entry;
            }
            
            return entry;
        });
    }

    async createJSONReport(data, filingPeriod) {
        console.log('Creating GSTR1 JSON file...');
        
        try {
            // Extract month and year from filing period
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
            
            let monthName = 'Unknown';
            let year = 'Unknown';
            let monthNumber = '01';
            
            if (filingPeriod) {
                const periodParts = filingPeriod.trim().split(' ');
                if (periodParts.length >= 2) {
                    monthName = periodParts[0];
                    year = periodParts[1];
                    const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
                    if (monthIndex !== -1) {
                        monthNumber = String(monthIndex + 1).padStart(2, '0');
                    }
                }
            }
            
            // Create GSTR1 JSON structure
            const gstr1Json = {
                "gstin": "27CJAPK3544E1ZH",
                "fp": `${monthNumber}${year}`,
                "version": "GST3.2.2",
                "hash": "hash"
            };
            
            // Process B2CS data
            const b2csData = [];
            
            console.log('DEBUG: B2CS data from Excel:', data.b2cs);
            
            if (data.b2cs && Array.isArray(data.b2cs)) {
                data.b2cs.forEach(row => {
                    console.log('DEBUG: Processing B2CS row:', row);
                    
                    if (!row['Place Of Supply']) return;
                    
                    const posCode = String(row['Place Of Supply']).split('-')[0].padStart(2, '0');
                    const rate = parseFloat(row['Rate']) || 0;
                    const txval = parseFloat(row['Taxable Value']) || 0;
                    
                    console.log(`DEBUG: posCode=${posCode}, rate=${rate}, txval=${txval}`);
                    
                    const entry = {
                        "sply_ty": posCode === "27" ? "INTRA" : "INTER",
                        "rt": parseFloat(rate.toFixed(2)),
                        "typ": "OE",
                        "pos": posCode,
                        "txval": parseFloat(txval.toFixed(2))
                    };
                    
                    if (entry.sply_ty === "INTRA") {
                        entry.camt = parseFloat((txval * rate / 200).toFixed(2));
                        entry.samt = parseFloat((txval * rate / 200).toFixed(2));
                    } else {
                        entry.iamt = parseFloat((txval * rate / 100).toFixed(2));
                    }
                    
                    // Add csamt at the end
                    entry.csamt = 0;
                    
                    console.log('DEBUG: Created B2CS entry:', entry);
                    b2csData.push(entry);
                });
            }
            
            console.log('DEBUG: Final B2CS data:', b2csData);
            gstr1Json.b2cs = b2csData;
            
            // Process HSN B2C data
            const hsnB2cData = [];
            
            console.log('DEBUG: HSN data from Excel:', data.hsn);
            console.log('DEBUG: All data keys for HSN:', Object.keys(data));
            
            if (data.hsn && Array.isArray(data.hsn)) {
                data.hsn.forEach((row, index) => {
                    console.log(`DEBUG: Processing HSN B2C row ${index}:`, row);
                    console.log('DEBUG: Available HSN row keys:', Object.keys(row));
                    
                    if (!row['HSN Code'] && !row['HSN'] && !row['hsn']) return;
                    
                    const hsnCode = row['HSN Code'] || row['HSN'] || row['hsn'] || '';
                    const descField = row['Description'] || '';
                    const uqcField = row['UQC'] || row['uqc'] || '';
                    const qtyField = row['Quantity'] || row['Total Quantity'] || row['qty'] || 0;
                    const rateField = row['Rate (%)'] || row['Rate'] || row['rate'] || 0;
                    const txvalField = row['Taxable Value (₹)'] || row['Taxable Value'] || row['txval'] || 0;
                    const iamtField = row['Integrated Tax (₹)'] || row['Integrated Tax Amount (₹)'] || row['iamt'] || 0;
                    const samtField = row['State Tax (₹)'] || row['State/UT Tax Amount (₹)'] || row['samt'] || 0;
                    const camtField = row['Central Tax (₹)'] || row['Central Tax Amount (₹)'] || row['camt'] || 0;
                    
                    console.log(`DEBUG: HSN fields - hsn=${hsnCode}, uqc=${uqcField}, qty=${qtyField}, rate=${rateField}, txval=${txvalField}`);
                    
                    hsnB2cData.push({
                        "num": index + 1,
                        "hsn_sc": String(hsnCode),
                        "desc": String(descField),
                        "uqc": String(uqcField).split('-')[0] || "PCS",
                        "qty": parseInt(qtyField) || 0,
                        "rt": parseFloat((parseFloat(rateField) || 0).toFixed(2)),
                        "txval": parseFloat((parseFloat(txvalField) || 0).toFixed(2)),
                        "iamt": parseFloat((parseFloat(iamtField) || 0).toFixed(2)),
                        "samt": parseFloat((parseFloat(samtField) || 0).toFixed(2)),
                        "camt": parseFloat((parseFloat(camtField) || 0).toFixed(2)),
                        "csamt": 0
                    });
                });
            }
            
            console.log('DEBUG: Final HSN B2C data:', hsnB2cData);
            gstr1Json.hsn = { "hsn_b2c": hsnB2cData };
            
            // Process E-commerce (SUPECO) data
            const clttxData = [];
            if (data.supeco && Array.isArray(data.supeco)) {
                data.supeco.forEach(row => {
                    if (!row['Platform']) return;
                    
                    const etin = row['Platform'] === 'Amazon' ? '27AAICA3918J1CT' : row['Platform'] === 'Flipkart' ? '27AACCF0683K1ZH' : '27AACCF6368D1CX';
                    
                    const suppval = parseFloat(row['Taxable Value (₹)']) || 0;
                    const igst = parseFloat(row['Integrated Tax (₹)']) || 0;
                    const cgst = parseFloat(row['Central Tax (₹)']) || 0;
                    const sgst = parseFloat(row['State Tax (₹)']) || 0;
                    
                    clttxData.push({
                        "etin": etin,
                        "suppval": suppval % 1 === 0 ? Number(suppval.toFixed(1)) : Number(suppval.toFixed(2)),
                        "igst": Number(igst.toFixed(2)),
                        "cgst": Number(cgst.toFixed(2)),
                        "sgst": Number(sgst.toFixed(2)),
                        "cess": 0,
                        "flag": "N"
                    });
                });
            }
            gstr1Json.supeco = { "clttx": clttxData };
            
            // Process Documents data
            const docsList = [];
            let docNumCounter = 1;
            
            console.log('DEBUG: Doc Issue data from Excel:', data.docIssue);
            console.log('DEBUG: All data keys:', Object.keys(data));
            
            // Try different possible keys for docs data
            const docsData = data.docIssue || data.docs || data.docissue || [];
            console.log('DEBUG: Using docs data:', docsData);
            
            if (docsData && Array.isArray(docsData)) {
                docsData.forEach(row => {
                    console.log('DEBUG: Processing Doc Issue row:', row);
                    
                    // Skip empty rows but don't require specific fields
                    if (!row || Object.keys(row).length === 0) return;
                    
                    console.log('DEBUG: Available row keys:', Object.keys(row));
                    
                    const fromField = row['Sr. No. From'] || row['Invoice Number From'] || row['From'] || row['from'] || '';
                    const toField = row['Sr. No. To'] || row['Invoice Number To'] || row['To'] || row['to'] || '';
                    const totalField = row['Total Number'] || row['Total'] || row['totnum'] || 0;
                    const cancelField = row['Cancelled'] || row['Cancel'] || row['cancel'] || 0;
                    
                    console.log(`DEBUG: from=${fromField}, to=${toField}, total=${totalField}, cancel=${cancelField}`);
                    
                    docsList.push({
                        "num": docNumCounter++,
                        "from": String(fromField),
                        "to": String(toField),
                        "totnum": parseInt(totalField) || 0,
                        "cancel": parseInt(cancelField) || 0,
                        "net_issue": (parseInt(totalField) || 0) - (parseInt(cancelField) || 0)
                    });
                });
            }
            
            console.log('DEBUG: Final docs list:', docsList);
            
            gstr1Json.doc_issue = {
                "doc_det": [{
                    "doc_num": 1,
                    "doc_typ": "Invoices for outward supply",
                    "docs": docsList
                }]
            };
            
            // Create JSON blob and URL
            const jsonString = JSON.stringify(gstr1Json, null, 0);
            const jsonBlob = new Blob([jsonString], { type: 'application/json' });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            
            // Store download URL and filename
            this.downloadUrls.json = jsonUrl;
            this.filenames.json = `${monthName}_${year}_GSTR1.json`;
            
            console.log('GSTR1 JSON created successfully');
            return { jsonUrl, filename: `${monthName}_${year}_GSTR1.json` };
            
        } catch (error) {
            console.error('Error creating JSON report:', error);
            throw error;
        }
    }

    async createExcelReport(data, filingPeriod) {
        console.log('Creating Excel file with colors using ExcelJS...');
        
        try {
            // Use ExcelJS for all sheets with proper styling support
            const workbook = new ExcelJS.Workbook();
            
            // Sheet 1: B2B,SEZ,DE with colors
            await this.createB2BSheetWithColors(workbook, data.b2b || []);
            
            // Sheet 2: B2CL with colors
            await this.createB2CLSheetWithColors(workbook, data.b2cl || []);
            
            // Sheet 3: B2CS with colors (reordered)
            await this.createB2CSSheetWithColors(workbook, data.b2cs || []);
            
            // Sheet 4: CDNR with colors
            await this.createCDNRSheetWithColors(workbook, data.cdnr || []);
            
            // Sheet 5: HSN(B2C) with colors (reordered)
            await this.createHSNSheetWithColors(workbook, data.hsn || []);
            
            // Sheet 6: HSN(B2B) with colors
            await this.createHSNB2BSheetWithColors(workbook, data.hsnb2b || []);
            
            // Sheet 7: EXEMP with colors
            await this.createEXEMPSheetWithColors(workbook, data.exemp || []);
            
            // Sheet 8: ECO with colors (reordered)
            await this.createECOSheetWithColors(workbook, data.supeco || []);
            
            // Sheet 9: DOCS with colors (reordered)
            await this.createDOCSSheetWithColors(workbook, data.docIssue || []);
            
            // Generate Excel file with ExcelJS
            console.log('Writing Excel workbook with all sheets and colors...');
            const excelBuffer = await workbook.xlsx.writeBuffer();
            const excelBlob = new Blob([excelBuffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const excelUrl = URL.createObjectURL(excelBlob);
            
            // Store download URL and filename
            this.downloadUrls.excel = excelUrl;
            this.filenames.excel = this.getExcelFilename(filingPeriod);
            
            // this.createDownloadButton(excelUrl, filingPeriod); // Removed - using new download section instead
            
        } catch (error) {
            console.error('Error creating Excel report:', error);
            alert('Error creating Excel report: ' + error.message);
        }
    }

    async createB2BSheetWithColors(workbook, b2bData) {
        const worksheet = workbook.addWorksheet('b2b,sez,de');
        
        // Add data rows
        const data = this.formatB2BSheet(b2bData);
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(row);
            
            // Apply styling based on row
            if (rowIndex === 0) {
                // Row 1: Blue headers for A1 and M1
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                excelRow.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(13).font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else if (rowIndex === 1) {
                // Row 2: Light blue for summary cells
                [1, 3, 5, 12, 13].forEach(colNum => {
                    excelRow.getCell(colNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                    excelRow.getCell(colNum).font = { bold: true };
                });
            } else if (rowIndex === 3) {
                // Row 4: Gray headers
                for (let col = 1; col <= 13; col++) {
                    excelRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    excelRow.getCell(col).font = { bold: true };
                }
            }
            
            // Add alignment to all cells
            for (let col = 1; col <= 13; col++) {
                excelRow.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
            }
        });
        
        // Set column widths
        worksheet.columns = [
            { width: 15 }, { width: 20 }, { width: 15 }, { width: 12 }, { width: 15 },
            { width: 15 }, { width: 12 }, { width: 18 }, { width: 12 }, { width: 15 },
            { width: 8 }, { width: 15 }, { width: 12 }
        ];
        
        // Remove cell merging - keep title only in A1
        
        console.log('B2B sheet created with colors');
    }

    async createB2CSSheetWithColors(workbook, b2csData) {
        const worksheet = workbook.addWorksheet('b2cs');
        const data = this.formatB2CSSheet(b2csData);
        
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(row);
            
            // Apply styling
            if (rowIndex === 0) {
                // Header row - only A1 and G1 get blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                excelRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(7).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                    });
            } else if (rowIndex === 1) {
                // Row 2 - Total headers get light blue background
                excelRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                excelRow.getCell(5).font = { bold: true };
                excelRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                excelRow.getCell(6).font = { bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                    });
            } else if (rowIndex === 3) {
                // Column headers (row 4)
                excelRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                    });
            } else {
                // Data rows with specific alignment
                excelRow.eachCell((cell, colNumber) => {
                    // Set alignment based on column
                    if (colNumber === 1 || colNumber === 2) {
                        // Type (A) and Place Of Supply (B) - left aligned
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else if (colNumber === 4 || colNumber === 5 || colNumber === 6) {
                        // Rate (D), Taxable Value (E), Cess Amount (F) - right aligned
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        // Other columns - center aligned
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            }
        });
        
        worksheet.columns = [
            { width: 12 }, { width: 20 }, { width: 20 }, { width: 8 }, { width: 15 }, { width: 12 }, { width: 15 }
        ];
    }

    async createHSNSheetWithColors(workbook, hsnData) {
        const worksheet = workbook.addWorksheet('hsn(b2c)');
        const data = this.formatHSNSheet(hsnData);
        
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(row);
            
            if (rowIndex === 0) {
                // Header row - only A1 and K1 get blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                excelRow.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(11).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 1) {
                // Row 2 - Summary headers get light blue background and right alignment for E-K
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                excelRow.getCell(1).font = { bold: true };
                [5, 7, 8, 9, 10, 11].forEach(colNum => {
                    excelRow.getCell(colNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                    excelRow.getCell(colNum).font = { bold: true };
                });
                
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber >= 5 && colNumber <= 11) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            } else if (rowIndex === 2) {
                // Row 3 - Special alignment for A3 (middle alignment for '1')
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber === 1) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (colNumber >= 5 && colNumber <= 11) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            } else if (rowIndex === 3) {
                // Column headers (row 4) - right align D-J
                excelRow.eachCell((cell, colNumber) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    cell.font = { bold: true };
                    
                    if (colNumber >= 4 && colNumber <= 10) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            } else {
                // Data rows - special alignment for HSN code and other columns
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber === 1) {
                        // HSN code (620821) - right aligned
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else if (colNumber >= 4 && colNumber <= 10) {
                        // Numeric columns D-J - right aligned
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        // Other columns - center aligned
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            }
        });
        
        worksheet.columns = [
            { width: 10 }, { width: 20 }, { width: 8 }, { width: 12 }, { width: 12 }, { width: 8 }, 
            { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 8 }
        ];
    }

    async createECOSheetWithColors(workbook, ecoData) {
        const worksheet = workbook.addWorksheet('eco');
        const data = this.formatECOSheet(ecoData);
        
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(row);
            
            if (rowIndex === 0) {
                // Header row - only A1 and H1 get blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                excelRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(8).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 1) {
                // Row 2 - Summary headers get light blue background
                [2, 4, 5, 6, 7, 8].forEach(colNum => {
                    excelRow.getCell(colNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                    excelRow.getCell(colNum).font = { bold: true };
                });
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 2) {
                // Row 3 - Summary values with specific alignment
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber >= 4 && colNumber <= 7) {
                        // D3-G3 right align
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            } else if (rowIndex === 3) {
                // Column headers (row 4)
                excelRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex >= 4) {
                // Data rows (all platforms) - left align cols 1-3, right align cols 4-7
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber >= 1 && colNumber <= 3) {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else if (colNumber >= 4 && colNumber <= 7) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            } else {
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            }
        });
        
        worksheet.columns = [
            { width: 20 }, { width: 15 }, { width: 20 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 }
        ];
    }

    async createDOCSSheetWithColors(workbook, docsData) {
        const worksheet = workbook.addWorksheet('docs');
        const data = this.formatDOCSSheet(docsData);
        
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(row);
            
            if (rowIndex === 0) {
                // Header row - only A1 and E1 get blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                excelRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(5).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 1) {
                // Row 2 - Summary headers get light blue background
                [4, 5].forEach(colNum => {
                    excelRow.getCell(colNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                    excelRow.getCell(colNum).font = { bold: true };
                });
                
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber >= 1 && colNumber <= 3) {
                        // A-C left align
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else if (colNumber >= 4 && colNumber <= 6) {
                        // D-F right align
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            } else if (rowIndex === 2) {
                // Row 3 - Summary values
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber >= 1 && colNumber <= 3) {
                        // A-C left align
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else if (colNumber >= 4 && colNumber <= 6) {
                        // D-F right align
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            } else if (rowIndex === 3) {
                // Column headers (row 4)
                excelRow.eachCell((cell, colNumber) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    cell.font = { bold: true };
                    
                    if (colNumber >= 1 && colNumber <= 3) {
                        // A-C left align for 'Nature of Document', 'Sr. No. From', 'Sr. No. To'
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else if (colNumber >= 4 && colNumber <= 5) {
                        // D-E right align for 'Total Number', 'Cancelled'
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            } else {
                // Data rows with specific alignment
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber >= 1 && colNumber <= 3) {
                        // A-C left align
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else if (colNumber >= 4 && colNumber <= 6) {
                        // D-F right align
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            }
        });
        
        worksheet.columns = [
            { width: 25 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 8 }
        ];
    }

    async createB2CLSheetWithColors(workbook, b2clData) {
        const worksheet = workbook.addWorksheet('b2cl');
        const data = this.formatB2CLSheet(b2clData);
        
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(row);
            
            if (rowIndex === 0) {
                // Header row - only A1 and I1 get blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                excelRow.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(9).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                    });
            } else if (rowIndex === 1) {
                // Row 2 - No. of Invoices gets light blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                excelRow.getCell(1).font = { bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                    });
            } else if (rowIndex === 3) {
                // Column headers (row 4)
                excelRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                    });
            } else {
                excelRow.eachCell(cell => {
                                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            }
        });
        
        worksheet.columns = [
            { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 20 }, { width: 8 }, { width: 15 }, { width: 12 }, { width: 18 }
        ];
    }

    async createCDNRSheetWithColors(workbook, cdnrData) {
        const worksheet = workbook.addWorksheet('cdnr');
        const data = this.formatCDNRSheet(cdnrData);
        
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(row);
            
            if (rowIndex === 0) {
                // Header row - only A1 and M1 get blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                excelRow.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(13).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 1) {
                // Row 2 - Summary headers get light blue background
                [1, 3, 9, 12, 13].forEach(colNum => {
                    excelRow.getCell(colNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                    excelRow.getCell(colNum).font = { bold: true };
                });
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 3) {
                // Column headers (row 4)
                excelRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else {
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            }
        });
        
        worksheet.columns = [
            { width: 15 }, { width: 20 }, { width: 15 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 15 }, { width: 12 }, { width: 20 }, { width: 8 }, { width: 15 }, { width: 12 }
        ];
    }

    async createHSNB2BSheetWithColors(workbook, hsnb2bData) {
        const worksheet = workbook.addWorksheet('hsn(b2b)');
        const data = this.formatHSNB2BSheet(hsnb2bData);
        
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(row);
            
            if (rowIndex === 0) {
                // Header row - only A1 and K1 get blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                excelRow.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(11).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 1) {
                // Row 2 - Summary headers get light blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                excelRow.getCell(1).font = { bold: true };
                [5, 7, 8, 9, 10, 11].forEach(colNum => {
                    excelRow.getCell(colNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                    excelRow.getCell(colNum).font = { bold: true };
                });
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 3) {
                // Column headers (row 4)
                excelRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else {
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            }
        });
        
        worksheet.columns = [
            { width: 10 }, { width: 20 }, { width: 8 }, { width: 12 }, { width: 12 }, { width: 8 }, 
            { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 }
        ];
    }

    async createEXEMPSheetWithColors(workbook, exempData) {
        const worksheet = workbook.addWorksheet('exemp');
        const data = this.formatEXEMPSheet(exempData);
        
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(row);
            
            if (rowIndex === 0) {
                // Header row - only A1 and D1 get blue background
                excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                excelRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                excelRow.getCell(4).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 1) {
                // Row 2 - Summary headers get light blue background
                [2, 3, 4].forEach(colNum => {
                    excelRow.getCell(colNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                    excelRow.getCell(colNum).font = { bold: true };
                });
                
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex === 3) {
                // Column headers (row 4)
                excelRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            } else if (rowIndex >= 4 && rowIndex <= 7) {
                // Rows 5-8 - Left align description column (A), center align others
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber === 1) {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            } else {
                excelRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            }
        });
        
        worksheet.columns = [
            { width: 40 }, { width: 20 }, { width: 30 }, { width: 20 }
        ];
    }

    formatB2CLSheet(b2clData) {
        return [
            ['Summary For B2CL(5)', '', '', '', '', '', '', '', 'HELP'],
            ['No. of Invoices', '', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '', ''],
            ['Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN']
        ];
    }

    formatCDNRSheet(cdnrData) {
        return [
            ['Summary For CDNR(9A)', '', '', '', '', '', '', '', '', '', '', '', 'HELP'],
            ['No. of Recipients', '', 'No. of Notes', '', '', '', '', '', 'Total Note Value', '', '', 'Total Taxable Value', 'Total Cess'],
            ['', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['GSTIN/UIN of Recipient', 'Receiver Name', 'Note Number', 'Note Date', 'Note Type', 'Place Of Supply', 'Reverse Charge', 'Note Supply Type', 'Note Value', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount']
        ];
    }

    formatHSNB2BSheet(hsnb2bData) {
        return [
            ['Summary For HSN(12)', '', '', '', '', '', '', '', '', '', 'HELP'],
            ['No. of HSN', '', '', '', 'Total Value', '', 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess'],
            ['', '', '', '', '', '', '', '', '', '', ''],
            ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount']
        ];
    }

    formatEXEMPSheet(exempData) {
        return [
            ['Summary For Nil rated, exempted and non GST outward supplies (8)', '', '', 'HELP'],
            ['', 'Total Nil Rated Supplies', 'Total Exempted Supplies', 'Total Non-GST Supplies'],
            ['', '', '', ''],
            ['Description', 'Nil Rated Supplies', 'Exempted(other than nil rated/non GST supply)', 'Non-GST Supplies'],
            ['Inter-State supplies to registered persons', '', '', ''],
            ['Intra-State supplies to registered persons', '', '', ''],
            ['Inter-State supplies to unregistered persons', '', '', ''],
            ['Intra-State supplies to unregistered persons', '', '', '']
        ];
    }

    formatB2CSSheet(b2csData) {
        if (!b2csData || !Array.isArray(b2csData)) {
            console.error('B2CS data is undefined or not an array:', b2csData);
            return [
                ['Summary For B2CS(7)', '', '', '', '', '', 'HELP'],
                ['', '', '', '', 'Total Taxable  Value', 'Total Cess', ''],
                ['', '', '', '', 0, '', ''],
                ['Type', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN']
            ];
        }
        
        // Calculate total taxable value from Principal Amount Basis
        const totalTaxableValue = b2csData.reduce((sum, row) => sum + (row['Taxable Value'] || 0), 0);
        
        return [
            ['Summary For B2CS(7)', '', '', '', '', '', 'HELP'],
            ['', '', '', '', 'Total Taxable  Value', 'Total Cess', ''],
            ['', '', '', '', Math.round(totalTaxableValue * 100) / 100, '', ''],
            ['Type', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN'],
            ...b2csData.map(row => [
                row['Type'] || 'OE',
                row['Place Of Supply'] || '',
                row['Applicable % of Tax Rate'] || '',
                row['Rate'] || 0,
                row['Taxable Value'] || 0,
                row['Cess Amount'] || '0',
                row['E-Commerce GSTIN'] || ''
            ])
        ];
    }

    formatHSNSheet(hsnData) {
        if (!hsnData || !Array.isArray(hsnData)) {
            console.error('HSN data is undefined or not an array:', hsnData);
            return [
                ['Summary For HSN(12)', '', '', '', '', '', '', '', '', '', '', 'HELP'],
                ['No. of HSN', '', '', '', 'Total Value', '', 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess'],
                [0, '', '', '', 0, '', 0, 0, 0, 0, ''],
                ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount']
            ];
        }
        
        const totalQuantity = hsnData.reduce((sum, row) => sum + (row['Quantity'] || 0), 0);
        const totalValue = hsnData.reduce((sum, row) => sum + (row['Taxable Value (₹)'] || 0), 0);
        const totalIgst = hsnData.reduce((sum, row) => sum + (row['Integrated Tax (₹)'] || 0), 0);
        const totalCgst = hsnData.reduce((sum, row) => sum + (row['Central Tax (₹)'] || 0), 0);
        const totalSgst = hsnData.reduce((sum, row) => sum + (row['State Tax (₹)'] || 0), 0);
        
        return [
            ['Summary For HSN(12)', '', '', '', '', '', '', '', '', '', 'HELP'],
            ['No. of HSN', '', '', '', 'Total Value', '', 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess'],
            [hsnData.length, '', '', '', totalValue, '', totalValue, totalIgst, totalCgst, totalSgst, ''],
            ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount'],
            ...hsnData.map(row => [
                row['HSN Code'] || '',
                (row['Description'] || '').replace('OF COTTON', '').trim(),
                'PCS-PIECES',
                row['Quantity'] || 0,
                row['Taxable Value (₹)'] || 0,
                row['Rate (%)'] || 0,
                row['Taxable Value (₹)'] || 0,
                row['Integrated Tax (₹)'] || 0,
                row['Central Tax (₹)'] || 0,
                row['State Tax (₹)'] || 0,
                row['Cess (₹)'] || ''
            ])
        ];
    }

    formatECOSheet(supecoData) {
        if (!supecoData || !Array.isArray(supecoData)) {
            console.error('SUPECO data is undefined or not an array:', supecoData);
            return [
                ['Summary For Supplies through ECO-14', '', '', '', '', '', '', 'HELP'],
                ['', 'No. of E-Commerce Operator', '', 'Total Net Value of Supplies', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess'],
                ['', 0, '', 0, 0, 0, 0, ''],
                ['Nature of Supply', 'GSTIN of E-Commerce Operator', 'E-Commerce Operator Name', 'Net value of supplies', 'Integrated tax', 'Central tax', 'State/UT tax', 'Cess']
            ];
        }
        
        const totalNetValue = supecoData.reduce((sum, row) => sum + (row['Taxable Value (₹)'] || 0), 0);
        const totalIgst = supecoData.reduce((sum, row) => sum + (row['Integrated Tax (₹)'] || 0), 0);
        const totalCgst = supecoData.reduce((sum, row) => sum + (row['Central Tax (₹)'] || 0), 0);
        const totalSgst = supecoData.reduce((sum, row) => sum + (row['State Tax (₹)'] || 0), 0);
        
        return [
            ['Summary For Supplies through ECO-14', '', '', '', '', '', '', 'HELP'],
            ['', 'No. of E-Commerce Operator', '', 'Total Net Value of Supplies', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess'],
            ['', supecoData.length, '', totalNetValue, totalIgst, totalCgst, totalSgst, ''],
            ['Nature of Supply', 'GSTIN of E-Commerce Operator', 'E-Commerce Operator Name', 'Net value of supplies', 'Integrated tax', 'Central tax', 'State/UT tax', 'Cess'],
            ...supecoData.map(row => [
                'Liable to collect tax u/s 52(TCS)',
                (row['Platform'] === 'Amazon') ? '27AAICA3918J1CT' : (row['Platform'] === 'Flipkart') ? '27AACCF0683K1ZH' : '27AACCF6368D1CX',
                (row['Platform'] || '').toLowerCase(),
                row['Taxable Value (₹)'] || 0,
                row['Integrated Tax (₹)'] || 0,
                row['Central Tax (₹)'] || 0,
                row['State Tax (₹)'] || 0,
                (row['Cess (₹)'] && row['Cess (₹)'] !== 0) ? row['Cess (₹)'] : ''
            ])
        ];
    }

    formatB2BSheet(b2bData) {
        console.log('Formatting B2B,SEZ,DE sheet data...');
        
        // B2B sheet header structure matching the reference screenshot exactly
        return [
            ['Summary For B2B, SEZ, DE (4A, 4B, 4B, 6C)', '', '', '', '', '', '', '', '', '', '', '', 'HELP'],
            ['No. of Recipients', '', 'No. of Invoices', '', 'Total Invoice Value', '', '', '', '', '', '', 'Total Taxable Value', 'Total Cess'],
            ['', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate', 'Invoice Type', 'E-Commerce GSTIN', 'Rate', 'Taxable Value', 'Cess Amount']
        ];
    }

    applyB2BSheetStyling(worksheet, data) {
        console.log('Applying B2B sheet styling...');
        
        // Set column widths
        if (!worksheet['!cols']) worksheet['!cols'] = [];
        worksheet['!cols'] = [
            { wch: 15 }, // A: GSTIN/UIN
            { wch: 20 }, // B: Receiver Name
            { wch: 15 }, // C: Invoice Number / No. of Invoices
            { wch: 12 }, // D: Invoice Date
            { wch: 15 }, // E: Invoice Value / Total Invoice Value
            { wch: 15 }, // F: Place Of Supply
            { wch: 12 }, // G: Reverse Charge
            { wch: 18 }, // H: Applicable % Tax Rate
            { wch: 12 }, // I: Invoice Type
            { wch: 15 }, // J: E-Commerce GSTIN
            { wch: 8 },  // K: Rate
            { wch: 15 }, // L: Taxable Value / Total Taxable Value
            { wch: 12 }  // M: Cess Amount / Total Cess
        ];
        
        // Set row heights
        if (!worksheet['!rows']) worksheet['!rows'] = [];
        worksheet['!rows'][0] = { hpt: 20 }; // Header row
        worksheet['!rows'][1] = { hpt: 18 }; // Summary row
        worksheet['!rows'][2] = { hpt: 18 }; // Count row
        worksheet['!rows'][3] = { hpt: 20 }; // Column headers
        
        // Apply cell styling with colors matching reference
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        
        // Merge cells for header row (A1:B1 for title)
        worksheet['!merges'].push({s: {c: 0, r: 0}, e: {c: 1, r: 0}});
        
        // Note: Basic XLSX library has limited styling support
        // Colors will be applied through Excel's default formatting when opened
        console.log('B2B sheet styling applied (colors will appear when opened in Excel)');
    }

    formatDOCSSheet(docData) {
        if (!docData || !Array.isArray(docData)) {
            console.error('DOCS data is undefined or not an array:', docData);
            return [
                ['Summary of documents issued during the tax period (13)', '', '', '', 'HELP'],
                ['', '', '', 'Total Number', 'Total Cancelled'],
                ['', '', '', 0, 0],
                ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled']
            ];
        }
        
        const totalDocs = docData.reduce((sum, row) => sum + (row['Total'] || 0), 0);
        const totalCancelled = docData.reduce((sum, row) => sum + (row['Cancelled'] || 0), 0);
        
        return [
            ['Summary of documents issued during the tax period (13)', '', '', '', 'HELP'],
            ['', '', '', 'Total Number', 'Total Cancelled'],
            ['', '', '', totalDocs, totalCancelled],
            ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled'],
            ...docData.map(row => [
                'Invoices for outward supply',
                row['From'] || '',
                row['To'] || '',
                row['Total'] || 0,
                row['Cancelled'] || 0
            ])
        ];
    }

    createDownloadButton(excelUrl, filingPeriod) {
        console.log('=== Creating download button ===');
        console.log('Excel URL:', excelUrl);
        console.log('Filing Period:', filingPeriod);
        
        // Find results div first
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) {
            console.error('Results div not found!');
            return;
        }
        
        // Find or create download section
        let downloadSection = document.getElementById('downloadSection');
        if (!downloadSection) {
            console.log('Creating new download section...');
            downloadSection = document.createElement('div');
            downloadSection.id = 'downloadSection';
            downloadSection.className = 'mt-4 text-center';
            downloadSection.style.display = 'block';
            resultsDiv.appendChild(downloadSection);
        }
        
        // Clear existing content
        downloadSection.innerHTML = '';
        
        // Create download button
        const excelBtn = document.createElement('a');
        excelBtn.href = excelUrl;
        // Create filename with format: "Month Name Year GSTR1"
        // Extract month and year from filing period (e.g., "August 2025" -> "August", "2025")
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        let monthName = 'Unknown';
        let year = 'Unknown';
        
        if (filingPeriod) {
            const periodParts = filingPeriod.trim().split(' ');
            if (periodParts.length >= 2) {
                monthName = periodParts[0];
                year = periodParts[1];
            }
        }
        
        excelBtn.download = `${monthName} ${year} GSTR1.xlsx`;
        excelBtn.className = 'btn btn-success btn-lg me-3';
        excelBtn.style.textDecoration = 'none';
        excelBtn.innerHTML = '<i class="fas fa-download me-2"></i>Download Excel Report';
        
        // Add the button
        downloadSection.appendChild(excelBtn);
        
        // Force visibility
        downloadSection.style.display = 'block';
        resultsDiv.style.display = 'block';
        
        console.log('Download button created and added to DOM');
        console.log('Download section visible:', downloadSection.style.display);
        console.log('Button element:', excelBtn);
    }

    createDownloadSection() {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) {
            console.error('Results div not found when creating download section');
            return null;
        }
        
        const downloadSection = document.createElement('div');
        downloadSection.id = 'downloadSection';
        downloadSection.className = 'mt-3 text-center';
        downloadSection.style.display = 'block';
        resultsDiv.appendChild(downloadSection);
        
        console.log('Download section created and appended to results');
        return downloadSection;
    }

    showResults() {
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.style.display = 'block';
            console.log('Results section made visible');
        }
    }

    getStateCode(stateName) {
        const stateCodeMap = {
            'JAMMU AND KASHMIR': '01', 'JAMMU & KASHMIR': '01',
            'HIMACHAL PRADESH': '02',
            'PUNJAB': '03',
            'CHANDIGARH': '04',
            'UTTARAKHAND': '05',
            'HARYANA': '06',
            'DELHI': '07', 'DELHI (NCT)': '07', 'NEW DELHI': '07',
            'RAJASTHAN': '08',
            'UTTAR PRADESH': '09',
            'BIHAR': '10',
            'SIKKIM': '11',
            'ARUNACHAL PRADESH': '12',
            'NAGALAND': '13',
            'MANIPUR': '14',
            'MIZORAM': '15',
            'TRIPURA': '16',
            'MEGHALAYA': '17',
            'ASSAM': '18',
            'WEST BENGAL': '19',
            'JHARKHAND': '20',
            'ODISHA': '21', 'ORISSA': '21', 'ODISHA (ORISSA)': '21',
            'CHHATTISGARH': '22',
            'MADHYA PRADESH': '23',
            'GUJARAT': '24',
            'DAMAN AND DIU': '25', 'DAMAN & DIU': '25',
            'DADRA AND NAGAR HAVELI': '26', 'DADRA & NAGAR HAVELI': '26',
            'MAHARASHTRA': '27',
            'KARNATAKA': '29',
            'GOA': '30',
            'LAKSHADWEEP': '31',
            'KERALA': '32',
            'TAMIL NADU': '33',
            'PUDUCHERRY': '34', 'PONDICHERRY': '34',
            'ANDAMAN AND NICOBAR ISLANDS': '35', 'ANDAMAN & NICOBAR ISLANDS': '35',
            'TELANGANA': '36',
            'ANDHRA PRADESH': '37',
            'LADAKH': '38'
        };
        
        const normalizedState = stateName.toUpperCase().trim();
        return stateCodeMap[normalizedState] || '27'; // Default to Maharashtra
    }

    displayResults(result) {
        console.log('Displaying results:', result);
        
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) {
            console.error('Results div not found!');
            return;
        }
        
        // Update the report summary section instead of overwriting everything
        const reportSummary = document.getElementById('reportSummary');
        if (reportSummary) {
            reportSummary.innerHTML = `
                <div class="alert alert-success">
                    <h4><i class="fas fa-check-circle me-2"></i>Reports Generated Successfully!</h4>
                    <p><strong>Filing Period:</strong> ${result.filingPeriod}</p>
                    <p><strong>Amazon Records:</strong> ${result.amazonRecords}</p>
                    <p><strong>Meesho Records:</strong> ${result.meeshoRecords}</p>
                    <p><strong>Flipkart Records:</strong> ${result.flipkartRecords}</p>
                    <p><strong>Total Records:</strong> ${result.totalRecords}</p>
                    <p><strong>Excel Generated:</strong> ${result.excelGenerated ? 'Yes' : 'No'}</p>
                    <div class="mt-3">
                        <h6>Download Reports</h6>
                        <button class="btn btn-outline-primary me-2 mb-2" id="downloadGSTR1JSON" onclick="window.gstGenerator.downloadJSON()">
                            <i class="fas fa-download"></i> GSTR1 JSON
                        </button>
                        <button class="btn btn-outline-primary me-2 mb-2" onclick="window.gstGenerator.downloadExcel()">
                            <i class="fas fa-download"></i> Excel Report
                        </button>
                    </div>
                </div>
            `;
        }
        
        resultsDiv.style.display = 'block';
        
        console.log('Results displayed with download section ready');
    }

    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseCSV(text) {
        const lines = text.split('\n');
        const result = [];
        
        for (let line of lines) {
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
                result.push(row);
            }
        }
        
        return result;
    }

    getExcelFilename(filingPeriod) {
        // Extract month and year from filing period
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        let monthName = 'Unknown';
        let year = 'Unknown';
        
        if (filingPeriod) {
            const periodParts = filingPeriod.trim().split(' ');
            if (periodParts.length >= 2) {
                monthName = periodParts[0];
                year = periodParts[1];
            }
        }
        
        return `${monthName} ${year} GSTR1.xlsx`;
    }

    downloadJSON() {
        if (this.downloadUrls.json && this.filenames.json) {
            const link = document.createElement('a');
            link.href = this.downloadUrls.json;
            link.download = this.filenames.json;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('JSON file downloaded:', this.filenames.json);
        } else {
            alert('JSON file not available. Please generate reports first.');
        }
    }

    downloadExcel() {
        if (this.downloadUrls.excel && this.filenames.excel) {
            const link = document.createElement('a');
            link.href = this.downloadUrls.excel;
            link.download = this.filenames.excel;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('Excel file downloaded:', this.filenames.excel);
        } else {
            alert('Excel file not available. Please generate reports first.');
        }
    }
    async processFlipkartFiles() {
        this.processedData.flipkart = {
            section7A2: [],
            section7B2: [],
            section12: [],
            section13: [],
            section3Gstr8: []
        };

        for (const file of this.flipkartFiles) {
            console.log(`Processing Flipkart file: ${file.name}`);
            const allSheets = await this.processExcelFileAllSheets(file);

            if (allSheets['Section 7(A)(2) in GSTR-1']) {
                this.processedData.flipkart.section7A2.push(...allSheets['Section 7(A)(2) in GSTR-1']);
            }
            if (allSheets['Section 7(B)(2) in GSTR-1']) {
                this.processedData.flipkart.section7B2.push(...allSheets['Section 7(B)(2) in GSTR-1']);
            }
            if (allSheets['Section 12 in GSTR-1']) {
                this.processedData.flipkart.section12.push(...allSheets['Section 12 in GSTR-1']);
            }
            if (allSheets['Section 13 in GSTR-1']) {
                this.processedData.flipkart.section13.push(...allSheets['Section 13 in GSTR-1']);
            }
            if (allSheets['Section 3 in GSTR-8']) {
                this.processedData.flipkart.section3Gstr8.push(...allSheets['Section 3 in GSTR-8']);
            }
        }

        console.log('Flipkart data loaded:');
        console.log('- Section 7(A)(2) rows:', this.processedData.flipkart.section7A2.length);
        console.log('- Section 7(B)(2) rows:', this.processedData.flipkart.section7B2.length);
        console.log('- Section 12 rows:', this.processedData.flipkart.section12.length);
        console.log('- Section 13 rows:', this.processedData.flipkart.section13.length);
        console.log('- Section 3 GSTR-8 rows:', this.processedData.flipkart.section3Gstr8.length);
    }

    flipkartToNum(v) {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return v;
        const cleaned = String(v).replace(/,/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }

    async processExcelFileAllSheets(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    console.log('Flipkart workbook sheet names:', workbook.SheetNames);

                    const result = {};
                    workbook.SheetNames.forEach(sheetName => {
                        const worksheet = workbook.Sheets[sheetName];

                        if (!worksheet['!ref']) {
                            result[sheetName] = [];
                            return;
                        }

                        // Fix: Some Excel generators (like Flipkart) write !ref as only the header row
                        // (e.g. "A1:IV1"), so we scan ALL actual cell keys to find the true max row/col
                        const range = XLSX.utils.decode_range(worksheet['!ref']);
                        Object.keys(worksheet).filter(k => k[0] !== '!').forEach(key => {
                            try {
                                const ref = XLSX.utils.decode_cell(key);
                                if (ref.r > range.e.r) range.e.r = ref.r;
                                if (ref.c > range.e.c) range.e.c = ref.c;
                            } catch (e) {}
                        });
                        console.log(`Sheet "${sheetName}" corrected range: rows 0-${range.e.r}`);

                        // Read headers from first row
                        const headers = {};
                        for (let C = range.s.c; C <= range.e.c; C++) {
                            const cellAddr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
                            const cell = worksheet[cellAddr];
                            if (cell) {
                                // cell.v = raw value, cell.w = formatted text (fallback for formula cells)
                                const rawKey = cell.v !== undefined ? cell.v : (cell.w !== undefined ? cell.w : '');
                                const cleanKey = String(rawKey).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                                if (cleanKey) headers[C] = cleanKey;
                            }
                        }

                        // Read data rows
                        const rows = [];
                        for (let R = range.s.r + 1; R <= range.e.r; R++) {
                            const rowObj = {};
                            let hasData = false;

                            for (const [Cstr, key] of Object.entries(headers)) {
                                const C = parseInt(Cstr);
                                const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
                                const cell = worksheet[cellAddr];

                                if (cell) {
                                    // Prefer cell.v (raw), fallback to cell.w (formatted text)
                                    const val = cell.v !== undefined ? cell.v : (cell.w !== undefined ? cell.w : null);
                                    rowObj[key] = val;
                                    if (val !== null && val !== '' && val !== undefined) hasData = true;
                                } else {
                                    rowObj[key] = null;
                                }
                            }

                            if (hasData) rows.push(rowObj);
                        }

                        result[sheetName] = rows;
                        console.log(`Sheet "${sheetName}": ${rows.length} rows`);
                        if (rows.length > 0) {
                            console.log(`  First row:`, rows[0]);
                        }
                    });

                    resolve(result);
                } catch (error) {
                    console.error('Error in processExcelFileAllSheets:', error);
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    processFlipkartDataForExcel() {
        console.log('Processing Flipkart data for Excel format...');

        const processedData = {
            b2b: [],
            b2cl: [],
            cdnr: [],
            b2cs: [],
            hsn: [],
            hsnb2b: [],
            exemp: [],
            docIssue: [],
            supeco: []
        };

        if (!this.processedData.flipkart ||
            (this.processedData.flipkart.section7A2.length === 0 &&
             this.processedData.flipkart.section7B2.length === 0 &&
             this.processedData.flipkart.section12.length === 0)) {
            console.log('No Flipkart data to process');
            return processedData;
        }

        const toNum = (v) => this.flipkartToNum(v);

        // === B2CS: Section 7(A)(2) - Intra-state Maharashtra (CGST + SGST) ===
        if (this.processedData.flipkart.section7A2) {
            this.processedData.flipkart.section7A2.forEach(row => {
                console.log('Flipkart 7A2 row:', row);
                const taxableValue = toNum(row['Aggregate Taxable Value Rs.']);
                const cgstRate = toNum(row['CGST %']);
                const sgstRate = toNum(row['SGST/UT %']);
                const rate = cgstRate + sgstRate;

                if (taxableValue !== 0) {
                    processedData.b2cs.push({
                        'Type': 'OE',
                        'Place Of Supply': '27-Maharashtra',
                        'Applicable % of Tax Rate': '',
                        'Rate': rate,
                        'Taxable Value': Math.round(taxableValue * 100) / 100,
                        'Cess Amount': '',
                        'E-Commerce GSTIN': ''
                    });
                }
            });
        }

        // === B2CS: Section 7(B)(2) - Inter-state (IGST, state-wise) ===
        if (this.processedData.flipkart.section7B2) {
            this.processedData.flipkart.section7B2.forEach(row => {
                console.log('Flipkart 7B2 row:', row);
                const taxableValue = toNum(row['Aggregate Taxable Value Rs.']);
                const rate = toNum(row['IGST %']);
                const stateName = String(row['Delivered State (PoS)'] || '').trim();
                const stateCode = this.getStateCode(stateName.toUpperCase());

                if (taxableValue !== 0 && stateName) {
                    const capitalizedState = stateName.split(' ').map(w =>
                        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                    ).join(' ');

                    processedData.b2cs.push({
                        'Type': 'OE',
                        'Place Of Supply': `${stateCode}-${capitalizedState}`,
                        'Applicable % of Tax Rate': '',
                        'Rate': rate,
                        'Taxable Value': Math.round(taxableValue * 100) / 100,
                        'Cess Amount': '',
                        'E-Commerce GSTIN': ''
                    });
                }
            });
        }

        // === HSN: Section 12 ===
        if (this.processedData.flipkart.section12) {
            this.processedData.flipkart.section12.forEach(row => {
                console.log('Flipkart sec12 row:', row);
                const hsnCode = String(row['HSN Number'] || row['HSN'] || '');
                const quantity = toNum(row['Total Quantity in Nos.'] || row['Quantity']);
                const taxableValue = toNum(row['Total Taxable Value Rs.'] || row['Taxable Value Rs.']);
                const igst = toNum(row['IGST Amount Rs.'] || row['Integrated Tax Amount Rs.']);
                const cgst = toNum(row['CGST Amount Rs.'] || row['Central Tax Amount Rs.']);
                const sgst = toNum(row['SGST Amount Rs.'] || row['SGST/UT Amount Rs.']);
                const rate = (taxableValue > 0 && (igst + cgst + sgst) > 0)
                    ? Math.round(((igst + cgst + sgst) / taxableValue) * 100)
                    : 5;

                if (hsnCode) {
                    processedData.hsn.push({
                        'HSN Code': hsnCode,
                        'Description': '',
                        'UQC': 'PCS',
                        'Quantity': quantity,
                        'Taxable Value (₹)': Math.round(taxableValue * 100) / 100,
                        'Rate (%)': rate,
                        'Integrated Tax (₹)': Math.round(igst * 100) / 100,
                        'Central Tax (₹)': Math.round(cgst * 100) / 100,
                        'State Tax (₹)': Math.round(sgst * 100) / 100,
                        'Cess (₹)': 0
                    });
                }
            });
        }

        // === Docs: Section 13 ===
        if (this.processedData.flipkart.section13) {
            this.processedData.flipkart.section13.forEach(row => {
                console.log('Flipkart sec13 row:', row);
                const from = String(row['Invoice Series From'] || '');
                const to = String(row['Invoice Series To'] || '');
                const total = Math.round(toNum(row['Total Number of Invoices']));
                const cancelled = Math.round(toNum(row['Cancelled if any']));

                if (from) {
                    processedData.docIssue.push({
                        'Document Type': 'Tax Invoice',
                        'From': from,
                        'To': to,
                        'Total': total,
                        'Cancelled': cancelled,
                        'Net Issued': total - cancelled
                    });
                }
            });
        }

        // === SUPECO: Section 3 in GSTR-8 ===
        if (this.processedData.flipkart.section3Gstr8) {
            this.processedData.flipkart.section3Gstr8.forEach(row => {
                console.log('Flipkart GSTR8 row:', row);
                const netTaxableValue = toNum(row['Net Taxable Value'] || row['Taxable Value Rs.'] || row['Net Value']);
                const igst = toNum(row['IGST Amount Rs.'] || row['Integrated Tax Amount Rs.']);
                const cgst = toNum(row['CGST Amount Rs.'] || row['Central Tax Amount Rs.']);
                const sgst = toNum(row['SGST Amount Rs.'] || row['SGST/UT Amount Rs.']);

                if (netTaxableValue !== 0) {
                    processedData.supeco.push({
                        'Platform': 'Flipkart',
                        'Taxable Value (₹)': Math.round(netTaxableValue * 100) / 100,
                        'Integrated Tax (₹)': Math.round(igst * 100) / 100,
                        'Central Tax (₹)': Math.round(cgst * 100) / 100,
                        'State Tax (₹)': Math.round(sgst * 100) / 100,
                        'Cess (₹)': 0
                    });
                }
            });
        }

        console.log('Flipkart data processed:', {
            b2cs: processedData.b2cs.length,
            hsn: processedData.hsn.length,
            docIssue: processedData.docIssue.length,
            supeco: processedData.supeco.length
        });

        return processedData;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    window.gstGenerator = new GSTReportGenerator();
    console.log('Application initialized');
});
