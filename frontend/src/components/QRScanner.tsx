import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { getAttendance, getGuestByQRCode, getWorkshopById, recordAttendance } from '../utils/dataUtils';
import { Camera, Check, CircleX } from 'lucide-react';
import successSound from '../media/success.wav';
import errorSound from '../media/error.wav';
// Linux-compatible short beep sounds in WAV format
const SUCCESS_AUDIO = successSound

const ERROR_AUDIO = errorSound;

interface QRScannerProps {
  workshopId: string;
  onSuccess?: (guestName: string) => void;
  onError?: (message: string) => void;
  soundEnabled?: boolean;
}

const QRScanner = ({ workshopId, onSuccess, onError, soundEnabled = true }: QRScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const errorAudioRef = useRef<HTMLAudioElement | null>(null);
  const scannerDivId = 'qr-reader';
  const isMounted = useRef(true);

  // Initialize audio elements
  useEffect(() => {
    // Create new Audio elements
    const successAudio = new Audio(SUCCESS_AUDIO);
    const errorAudio = new Audio(ERROR_AUDIO);
    
    // Set volume
    successAudio.volume = 0.5;
    errorAudio.volume = 0.5;
    
    successAudioRef.current = successAudio;
    errorAudioRef.current = errorAudio;
    
    // Preload audio files
    const preloadAudio = async () => {
      try {
        await successAudio.load();
        await errorAudio.load();
      } catch (err) {
        console.error('Error preloading audio:', err);
      }
    };
    
    preloadAudio();
    
    return () => {
      if (successAudioRef.current) {
        successAudioRef.current.pause();
        successAudioRef.current = null;
      }
      if (errorAudioRef.current) {
        errorAudioRef.current.pause();
        errorAudioRef.current = null;
      }
    };
  }, []);

  const playSound = async (success: boolean) => {
    if (!soundEnabled) return;
    try {
      const audio = success ? successAudioRef.current : errorAudioRef.current;
      if (audio) {
        audio.currentTime = 0;
        await audio.play();
      }
    } catch (err) {
      console.error('Error playing sound effect:', err);
    }
  };

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && scanning) {
        // Page is hidden (user switched tabs)
        console.log('Page hidden, stopping scanner');
        stopScanner();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scanning]);

  // Handle component mount/unmount
  useEffect(() => {
    console.log('QRScanner component mounted');
    // Don't initialize scanner on mount, let user explicitly start scanning
    isMounted.current = true;
    
    // Reset state when component mounts
    setScanning(false);
    setScanResult(null);
    setCameraError(null);
    
    return () => {
      console.log('QRScanner component unmounting');
      isMounted.current = false;
      // Clean up on unmount - ensure camera is stopped
      if (scannerRef.current) {
        try {
          const isScanning = scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING;
          if (isScanning) {
            console.log('Component unmounting, stopping scanner');
            scannerRef.current.stop().catch(err => console.error('Error stopping scanner on unmount:', err));
          }
        } catch (err) {
          console.error('Error checking scanner state during unmount:', err);
        }
      }
    };
  }, []);

  // Ensure scanner is properly stopped if workshopId changes
  useEffect(() => {
    if (scanning) {
      stopScanner();
    }
    // Reset scan result when workshop changes
    setScanResult(null);
  }, [workshopId]);

  const startScanner = async () => {
    if (!isMounted.current) return;
    
    setScanning(true);
    setScanResult(null);
    setCameraError(null);
    
    try {
      // Always reset scanner instance when starting
      if (scannerRef.current) {
        try {
          // Check if scanner is active and stop it first
          const isScanning = scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING;
          if (isScanning) {
            await scannerRef.current.stop();
            console.log('Stopped existing scanner before starting new one');
          }
        } catch (err) {
          console.error('Error checking scanner state:', err);
        }
      }
      
      // Create a fresh scanner instance
      console.log('Creating new scanner instance');
      scannerRef.current = new Html5Qrcode(scannerDivId);
      
      // Get list of available video devices
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        console.log('Cameras found:', devices.length);
        
        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          onScanSuccess,
          onScanFailure
        );
        console.log('Scanner started successfully');
      } else {
        setCameraError('No camera found on your device');
        setScanning(false);
        if (onError) onError('No camera found on your device');
      }
    } catch (err) {
      console.error('Error starting scanner:', err);
      setScanning(false);
      
      // More detailed error message
      let errorMsg = 'Failed to start camera.';
      if (err instanceof Error) {
        if (err.message.includes('permission')) {
          errorMsg = 'Camera permission denied. Please allow camera access and try again.';
        } else if (err.message.includes('device')) {
          errorMsg = 'No camera device available or camera is in use by another application.';
        }
      }
      
      setCameraError(errorMsg);
      if (onError) onError(errorMsg);
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current) return;
    
    try {
      console.log('Attempting to stop scanner');
      // Check if scanner is active
      const isScanning = scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING;
      
      if (isScanning) {
        console.log('Scanner is active, stopping...');
        await scannerRef.current.stop();
        console.log('Scanner stopped successfully');
      } else {
        console.log('Scanner was not active');
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    } finally {
      if (isMounted.current) {
        setScanning(false);
        // Clear scanner instance after stopping to ensure fresh start next time
        scannerRef.current = null;
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (!isMounted.current) return;
    
    // Don't stop scanner immediately, just process the result
    // This allows for continuous scanning of multiple guests
    
    // Check if QR code format is valid
    if (!decodedText.startsWith('guest-')) {
      playSound(false);
      setScanResult({ success: false, message: 'Invalid QR code format' });
      if (onError) onError('Invalid QR code format');
      return;
    }
    
    try {
      // Find guest by QR code
      const guest = await getGuestByQRCode(decodedText);
      
      if (!guest) {
        playSound(false);
        setScanResult({ success: false, message: 'Guest not found' });
        if (onError) onError('Guest not found');
        return;
      }
      
      // Check if workshop exists
      const workshop = await getWorkshopById(workshopId);
      
      if (!workshop) {
        playSound(false);
        setScanResult({ success: false, message: 'Workshop not found' });
        if (onError) onError('Workshop not found');
        return;
      }

      // Get attendance records
      const attendance = await getAttendance();

      // Check if guest has VIP access for VIP workshops
      if (workshop.isVip && !guest.isVip) {
        playSound(false);
        setScanResult({ success: false, message: 'This is a VIP workshop. Guest does not have VIP access.' });
        if (onError) onError('This is a VIP workshop. Guest does not have VIP access.');
        return;
      }
      
      // Check workshop capacity if set
      if (workshop.maxCapacity) {
        const workshopAttendance = attendance.filter(record => record.workshop_id === workshopId);
        if (workshopAttendance.length >= workshop.maxCapacity) {
          playSound(false);
          setScanResult({ success: false, message: 'Workshop has reached maximum capacity' });
          if (onError) onError('Workshop has reached maximum capacity');
          return;
        }
      }
      
      // Check if attendance is already recorded
      const existingRecord = attendance.find(
        record => record.guestId === guest.id && record.workshopId === workshopId
      );
      
      if (existingRecord) {
        playSound(true);
        setScanResult({ 
          success: true, 
          message: `${guest.name} already checked in to this workshop` 
        });
        if (onSuccess) onSuccess(guest.name);
        return;
      }
      
      // Record attendance
      await recordAttendance(guest.id, workshopId);
      
      playSound(true);
      setScanResult({ 
        success: true, 
        message: `${guest.name} checked in successfully` 
      });
      
      if (onSuccess) onSuccess(guest.name);
    } catch (error) {
      console.error('Error processing QR code:', error);
      playSound(false);
      
      // Handle specific error messages
      let errorMessage = 'Error processing QR code';
      if (error instanceof Error) {
        if (error.message === "Non-VIP guest cannot attend VIP workshops") {
          errorMessage = "This guest does not have VIP access for this workshop";
        }
      }
      
      setScanResult({ success: false, message: errorMessage });
      if (onError) onError(errorMessage);
    }
  };

  const onScanFailure = (error: string) => {
    // Don't do anything on scan failure, just keep scanning
    console.log('QR scan error:', error);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-sm relative bg-white dark:bg-neutral-800 rounded-lg overflow-hidden shadow-md">
        <div 
          id={scannerDivId} 
          className="w-full h-[300px] relative flex items-center justify-center bg-neutral-50 dark:bg-neutral-900"
          style={{ 
            position: 'relative',
            maxWidth: '100%' 
          }}
        >
          {!scanning && !scanResult && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900">
              <Camera size={60} className="text-neutral-400 dark:text-neutral-500 mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400 mb-2">Camera not started</p>
              <button
                onClick={startScanner}
                className="mt-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                <Camera size={18} className="inline-block mr-2" />
                Start Camera
              </button>
            </div>
          )}
          
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
              <CircleX size={48} className="text-error-500 mb-4" />
              <p className="text-error-600 dark:text-error-400 mb-2 text-center">{cameraError}</p>
              <button
                onClick={startScanner}
                className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
      
      {scanResult && (
        <div className={`mt-4 p-4 rounded-lg w-full max-w-sm shadow-sm ${
          scanResult.success 
            ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-500/20' 
            : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-500/20'
        }`}>
          <div className="flex items-center">
            {scanResult.success ? (
              <Check size={20} className="text-success-500 mr-2 flex-shrink-0" />
            ) : (
              <CircleX size={20} className="text-error-500 mr-2 flex-shrink-0" />
            )}
            <p className={`${
              scanResult.success 
                ? 'text-success-700 dark:text-success-400' 
                : 'text-error-700 dark:text-error-400'
            }`}>
              {scanResult.message}
            </p>
          </div>
        </div>
      )}
      
      {scanning && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={stopScanner}
            className="px-6 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 transition-colors"
          >
            Stop Camera
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
