/**
 * SISTEMA DE IMPRESSÁO AUTOMÁTICA AVANÇADO - ALUFORCE v2.0
 * Integração com PDF, impressoras de rede e fila de impressão
 */

const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const printer = require('printer');

class AutoPrintSystem {
    constructor() {
        this.printQueue = [];
        this.printHistory = [];
        this.printerSettings = {
            defaultPrinter: process.env.DEFAULT_PRINTER || null,
            paperSize: 'A4',
            orientation: 'portrait',
            copies: 1,
            colorMode: 'color'
        };
        
        this.pdfConfig = {
            format: 'A4',
            printBackground: true,
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        };

        this.queueProcessingInterval = null;
        this.init();
    }

    async init() {
        try {
            await this.loadPrintQueue();
            await this.detectAvailablePrinters();
            this.startQueueProcessor();
            console.log('✅ Sistema de impressão inicialização');
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema de impressão:', error.message);
        }
    }

    async loadPrintQueue() {
        try {
            const queueFile = path.join(__dirname, '..', 'logs', 'print-queue.json');
            const data = await fs.readFile(queueFile, 'utf8');
            this.printQueue = JSON.parse(data);
        } catch (error) {
            // Arquivo não existe, usar fila vazia
            this.printQueue = [];
            await this.savePrintQueue();
        }
    }

    async savePrintQueue() {
        try {
            const queueFile = path.join(__dirname, '..', 'logs', 'print-queue.json');
            await fs.writeFile(queueFile, JSON.stringify(this.printQueue, null, 2));
        } catch (error) {
            console.error('Erro ao salvar fila de impressão:', error.message);
        }
    }

    async detectAvailablePrinters() {
        try {
            this.availablePrinters = printer.getPrinters();
            console.log(`📨 Detectadas ${this.availablePrinters.length} impressoras:`);
            
            this.availablePrinters.forEach(p => {
                console.log(`   - ${p.name} (${p.status})`);
            });

            // Definir impressora padrão se não configurada
            if (!this.printerSettings.defaultPrinter && this.availablePrinters.length > 0) {
                this.printerSettings.defaultPrinter = this.availablePrinters[0].name;
                console.log(`📨 Impressora padrão definida: ${this.printerSettings.defaultPrinter}`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao detectar impressoras:', error.message);
            this.availablePrinters = [];
        }
    }

    // Converter Excel para PDF
    async convertExcelToPDF(excelFilePath, outputPath = null) {
        if (!outputPath) {
            outputPath = excelFilePath.replace(/\.xlsx$/i, '.pdf');
        }

        try {
            // Gerar HTML temporário do Excel
            const htmlContent = await this.excelToHTML(excelFilePath);
            const tempHtmlPath = path.join(__dirname, '..', 'temp_excel', 'temp.html');
            
            await fs.writeFile(tempHtmlPath, htmlContent);

            // Converter HTML para PDF usando Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });

            await page.pdf({
                path: outputPath,
                ...this.pdfConfig
            });

            await browser.close();

            // Limpar arquivo temporário
            setTimeout(() => {
                fs.unlink(tempHtmlPath).catch(console.error);
            }, 1000);

            console.log(`📄 PDF geração: ${outputPath}`);
            return outputPath;

        } catch (error) {
            throw new Error(`Erro ao converter Excel para PDF: ${error.message}`);
        }
    }

    async excelToHTML(excelFilePath) {
        // Simulação básica - em produção usaria uma biblioteca como 'node-xlsx'
        const ExcelJS = require('exceljs');
        
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(excelFilePath);
            
            const worksheet = workbook.getWorksheet(1);
            let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { border-collapse: collapse; width: 100%; }
                        td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        .header { background-color: #f2f2f2; font-weight: bold; }
                        .number { text-align: right; }
                        .center { text-align: center; }
                        @media print { 
                            body { margin: 0; } 
                            table { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <table>
            `;

            worksheet.eachRow((row, rowNumber) => {
                html += '<tr>';
                row.eachCell((cell, colNumber) => {
                    const value = cell.value || '';
                    const isHeader = rowNumber <= 3;
                    const cellClass = isHeader  'header' : 
                                    (typeof value === 'number'  'number' : '');
                    
                    html += `<td class="${cellClass}">${value}</td>`;
                });
                html += '</tr>';
            });

            html += `
                    </table>
                </body>
                </html>
            `;

            return html;

        } catch (error) {
            throw new Error(`Erro ao processar Excel: ${error.message}`);
        }
    }

    // Adicionar documento à fila de impressão
    async addToPrintQueue(printJob) {
        const job = {
            id: `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: printJob.type || 'pdf', // 'pdf', 'excel', 'html'
            filePath: printJob.filePath,
            printer: printJob.printer || this.printerSettings.defaultPrinter,
            copies: printJob.copies || 1,
            paperSize: printJob.paperSize || 'A4',
            orientation: printJob.orientation || 'portrait',
            colorMode: printJob.colorMode || 'color',
            priority: printJob.priority || 'normal', // 'high', 'normal', 'low'
            createdAt: new Date().toISOString(),
            status: 'pending',
            createdBy: printJob.createdBy || 'system',
            metadata: {
                documentName: printJob.documentName || path.basename(printJob.filePath),
                department: printJob.department || 'Geral',
                requestId: printJob.requestId || null
            }
        };

        // Adicionar à fila com prioridade
        if (job.priority === 'high') {
            this.printQueue.unshift(job);
        } else {
            this.printQueue.push(job);
        }

        await this.savePrintQueue();
        
        console.log(`📋 Documento adicionação à fila: ${job.metadata.documentName}`);
        return job.id;
    }

    // Processar fila de impressão
    startQueueProcessor() {
        if (this.queueProcessingInterval) {
            clearInterval(this.queueProcessingInterval);
        }

        this.queueProcessingInterval = setInterval(async () => {
            await this.processNextInQueue();
        }, 5000); // Verificar a cada 5 segundos

        console.log('🔄 Processaçãor de fila de impressão iniciação');
    }

    async processNextInQueue() {
        if (this.printQueue.length === 0) return;

        const job = this.printQueue[0];
        
        try {
            job.status = 'processing';
            job.processedAt = new Date().toISOString();
            
            await this.executeJob(job);
            
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            
            // Mover para histórico
            this.printHistory.unshift(job);
            this.printQueue.shift();
            
            // Manter apenas últimos 100 no histórico
            if (this.printHistory.length > 100) {
                this.printHistory = this.printHistory.slice(0, 100);
            }

            console.log(`✅ Impressão concluída: ${job.metadata.documentName}`);

        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.failedAt = new Date().toISOString();
            
            // Mover job falhação para o final da fila para retry
            this.printQueue.shift();
            if (job.retryCount < 3) {
                job.retryCount = (job.retryCount || 0) + 1;
                this.printQueue.push(job);
                console.log(`⚠️ Erro na impressão, tentativa ${job.retryCount}/3: ${error.message}`);
            } else {
                this.printHistory.unshift(job);
                console.log(`❌ Impressão falhou definitivamente: ${error.message}`);
            }
        }

        await this.savePrintQueue();
    }

    async executeJob(job) {
        const { filePath, type, printer: printerName } = job;

        // Verificar se arquivo existe
        try {
            await fs.access(filePath);
        } catch (error) {
            throw new Error(`Arquivo não encontração: ${filePath}`);
        }

        // Verificar impressora
        const printer = this.availablePrinters.find(p => p.name === printerName);
        if (!printer) {
            throw new Error(`Impressora não encontrada: ${printerName}`);
        }

        let fileToPrint = filePath;

        // Converter para PDF se necessário
        if (type === 'excel') {
            const pdfPath = filePath.replace(/\.xlsx$/i, '.pdf');
            fileToPrint = await this.convertExcelToPDF(filePath, pdfPath);
        }

        // Executar impressão
        await this.printFile(fileToPrint, job);
    }

    async printFile(filePath, job) {
        return new Promise((resolve, reject) => {
            try {
                const printOptions = {
                    printer: job.printer,
                    type: 'PDF',
                    options: {
                        copies: job.copies,
                        'page-ranges': '1-999',
                        'fit-to-page': true,
                        'media': job.paperSize,
                        'orientation-requested': job.orientation === 'landscape'  '4' : '3',
                        'print-color-mode': job.colorMode === 'mono'  'monochrome' : 'color'
                    }
                };

                // Ler arquivo
                fs.readFile(filePath)
                    .then(data => {
                        printer.printDirect({
                            data: data,
                            printer: job.printer,
                            type: 'PDF',
                            options: printOptions.options,
                            success: function(jobID) {
                                console.log(`📨 Enviação para impressora: Job ID ${jobID}`);
                                resolve(jobID);
                            },
                            error: function(error) {
                                reject(new Error(`Erro ao imprimir: ${error}`));
                            }
                        });
                    })
                    .catch(reject);

            } catch (error) {
                reject(error);
            }
        });
    }

    // Impressão rápida de Excel
    async quickPrintExcel(excelFilePath, options = {}) {
        try {
            const printJob = {
                type: 'excel',
                filePath: excelFilePath,
                documentName: options.documentName || path.basename(excelFilePath),
                copies: options.copies || 1,
                priority: options.priority || 'normal',
                createdBy: options.createdBy || 'user',
                department: options.department || 'PCP'
            };

            const jobId = await this.addToPrintQueue(printJob);
            
            return {
                success: true,
                jobId,
                message: 'Documento adicionação à fila de impressão',
                queuePosition: this.printQueue.length
            };

        } catch (error) {
            throw new Error(`Erro na impressão rápida: ${error.message}`);
        }
    }

    // Configurar impressora padrão
    async setDefaultPrinter(printerName) {
        const printer = this.availablePrinters.find(p => p.name === printerName);
        if (!printer) {
            throw new Error('Impressora não encontrada');
        }

        this.printerSettings.defaultPrinter = printerName;
        console.log(`📨 Impressora padrão alterada para: ${printerName}`);
        
        return true;
    }

    // Obter status da fila
    getQueueStatus() {
        const pending = this.printQueue.filter(j => j.status === 'pending').length;
        const processing = this.printQueue.filter(j => j.status === 'processing').length;
        const failed = this.printHistory.filter(j => j.status === 'failed').length;
        const completed = this.printHistory.filter(j => j.status === 'completed').length;

        return {
            queue: {
                total: this.printQueue.length,
                pending,
                processing
            },
            history: {
                total: this.printHistory.length,
                completed,
                failed
            },
            printers: {
                total: this.availablePrinters.length,
                default: this.printerSettings.defaultPrinter,
                available: this.availablePrinters.map(p => ({
                    name: p.name,
                    status: p.status,
                    isDefault: p.name === this.printerSettings.defaultPrinter
                }))
            }
        };
    }

    // Cancelar job na fila
    async cancelJob(jobId) {
        const jobIndex = this.printQueue.findIndex(j => j.id === jobId);
        if (jobIndex === -1) {
            throw new Error('Job não encontração na fila');
        }

        const job = this.printQueue[jobIndex];
        job.status = 'cancelled';
        job.cancelledAt = new Date().toISOString();

        this.printQueue.splice(jobIndex, 1);
        this.printHistory.unshift(job);

        await this.savePrintQueue();
        
        console.log(`❌ Job cancelação: ${job.metadata.documentName}`);
        return true;
    }

    // Limpar fila
    async clearQueue() {
        const cancelledJobs = this.printQueue.filter(j => j.status === 'pending');
        
        cancelledJobs.forEach(job => {
            job.status = 'cancelled';
            job.cancelledAt = new Date().toISOString();
            this.printHistory.unshift(job);
        });

        this.printQueue = this.printQueue.filter(j => j.status === 'processing');
        
        await this.savePrintQueue();
        
        console.log(`🗑️ Fila limpa: ${cancelledJobs.length} jobs cancelaçãos`);
        return cancelledJobs.length;
    }

    // Obter estatísticas de impressão
    getStatistics() {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const jobs24h = this.printHistory.filter(j => 
            new Date(j.createdAt) >= last24h
        );
        const jobs7d = this.printHistory.filter(j => 
            new Date(j.createdAt) >= last7d
        );

        const stats = {
            total: this.printHistory.length,
            last24h: {
                total: jobs24h.length,
                completed: jobs24h.filter(j => j.status === 'completed').length,
                failed: jobs24h.filter(j => j.status === 'failed').length,
                successRate: jobs24h.length > 0  
                    Math.round((jobs24h.filter(j => j.status === 'completed').length / jobs24h.length) * 100) : 0
            },
            last7d: {
                total: jobs7d.length,
                completed: jobs7d.filter(j => j.status === 'completed').length,
                failed: jobs7d.filter(j => j.status === 'failed').length,
                successRate: jobs7d.length > 0  
                    Math.round((jobs7d.filter(j => j.status === 'completed').length / jobs7d.length) * 100) : 0
            },
            byDepartment: this.getStatsByDepartment(),
            byPrinter: this.getStatsByPrinter()
        };

        return stats;
    }

    getStatsByDepartment() {
        const departments = {};
        this.printHistory.forEach(job => {
            const dept = job.metadata.department || 'Não especificação';
            if (!departments[dept]) {
                departments[dept] = { total: 0, completed: 0, failed: 0 };
            }
            departments[dept].total++;
            if (job.status === 'completed') departments[dept].completed++;
            if (job.status === 'failed') departments[dept].failed++;
        });
        return departments;
    }

    getStatsByPrinter() {
        const printers = {};
        this.printHistory.forEach(job => {
            const printer = job.printer || 'Não especificação';
            if (!printers[printer]) {
                printers[printer] = { total: 0, completed: 0, failed: 0 };
            }
            printers[printer].total++;
            if (job.status === 'completed') printers[printer].completed++;
            if (job.status === 'failed') printers[printer].failed++;
        });
        return printers;
    }

    // Parar sistema
    async stop() {
        if (this.queueProcessingInterval) {
            clearInterval(this.queueProcessingInterval);
            this.queueProcessingInterval = null;
        }
        
        await this.savePrintQueue();
        console.log('🛑 Sistema de impressão paração');
    }
}

module.exports = AutoPrintSystem;