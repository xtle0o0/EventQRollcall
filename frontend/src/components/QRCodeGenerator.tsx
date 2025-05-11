import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Printer } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  title?: string;
}

const QRCodeGenerator = ({ value, size = 200, title }: QRCodeGeneratorProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (value) {
      generateQRCode();
    }
  }, [value]);

  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(value, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  const downloadQRCode = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode-${value.substring(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyQRCode = () => {
    navigator.clipboard.writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>QR Code - ${title || value}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            img { max-width: 300px; }
            .container { margin: 0 auto; max-width: 400px; }
            p { margin-top: 20px; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${title || 'QR Code'}</h2>
            <img src="${qrDataUrl}" alt="QR Code" />
            <p>${value}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  if (!qrDataUrl) {
    return <div className="flex justify-center items-center h-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
      <p className="text-gray-500 dark:text-gray-400">Generating QR Code...</p>
    </div>;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4">
        <img src={qrDataUrl} alt="QR Code" className="max-w-full" />
      </div>
      
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Scan this code to verify attendance</p>
        <p className="text-xs mt-2 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded truncate max-w-xs">{value}</p>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={downloadQRCode}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Download size={16} className="mr-2" />
          Download
        </button>
        <button
          onClick={copyQRCode}
          className={`inline-flex items-center px-3 py-2 rounded-md shadow-sm text-sm font-medium ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Copy size={16} className="mr-2" />
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
        <button
          onClick={printQRCode}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Printer size={16} className="mr-2" />
          Print
        </button>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
