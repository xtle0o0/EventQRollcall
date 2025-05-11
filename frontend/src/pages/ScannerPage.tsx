import { useState, useEffect } from 'react';
import { getWorkshops } from '../utils/dataUtils';
import QRScanner from '../components/QRScanner';
import { CircleAlert, Info, Camera, CameraOff, XCircle, Volume2, VolumeX } from 'lucide-react';

interface Workshop {
  id: string;
  name: string;
  isVip: boolean;
  maxCapacity?: number;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
  timestamp: number;
}

const ScannerPage = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    console.log('Scanner page mounted');
    const fetchWorkshops = async () => {
      try {
        setLoading(true);
        const workshopsData = await getWorkshops();
        setWorkshops(workshopsData);
        if (workshopsData.length > 0) {
          setSelectedWorkshopId(workshopsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching workshops:', error);
        addNotification('error', 'Failed to load workshops. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshops();
    
    return () => {
      console.log('Scanner page unmounting, stopping scanner');
      setScannerActive(false);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("Page hidden, stopping scanner");
        setScannerActive(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const addNotification = (type: 'success' | 'error', message: string) => {
    const newNotification = {
      type,
      message,
      timestamp: Date.now()
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.timestamp !== newNotification.timestamp));
    }, 5000);
  };

  const removeNotification = (timestamp: number) => {
    setNotifications(prev => prev.filter(n => n.timestamp !== timestamp));
  };

  const handleSuccess = (guestName: string) => {
    addNotification('success', `${guestName} checked in successfully!`);
  };

  const handleError = (message: string) => {
    // Map backend error messages to more user-friendly messages
    let displayMessage = message;
    if (message.includes('Non-VIP guest cannot attend')) {
      displayMessage = 'This guest does not have VIP status for this workshop';
    } else if (message.includes('does not have access to this VIP workshop')) {
      displayMessage = 'This VIP guest is not registered for this workshop';
    } else if (message.includes('maximum capacity')) {
      displayMessage = 'Workshop has reached its maximum capacity';
    } else if (message.includes('already recorded')) {
      displayMessage = 'Guest has already checked in to this workshop';
    }
    
    addNotification('error', displayMessage);
  };

  const startScanning = () => {
    setScannerKey((prev: number) => prev + 1);
    setScannerActive(true);
    setNotifications([]); // Clear previous notifications
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">QR Scanner</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Scan guest QR codes to record attendance</p>
        </div>
        <button
          onClick={toggleSound}
          className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title={soundEnabled ? 'Disable Sound' : 'Enable Sound'}
        >
          {soundEnabled ? (
            <Volume2 className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
          ) : (
            <VolumeX className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
          )}
        </button>
      </div>

      {workshops.length === 0 ? (
        <div className="card p-6 mb-6 border-l-4 border-warning-500">
          <div className="flex items-start">
            <CircleAlert className="h-5 w-5 text-warning-500 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-warning-700 dark:text-warning-400">
                No workshops created yet. Please create at least one workshop before scanning.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="card p-6 mb-6">
            <div className="flex justify-between items-center">
              <label htmlFor="workshop" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Select Workshop
              </label>
              <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
                <span>Sound:</span>
                <button
                  onClick={toggleSound}
                  className={`px-2 py-1 rounded ${
                    soundEnabled 
                      ? 'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400' 
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400'
                  }`}
                >
                  {soundEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>
            <select
              id="workshop"
              value={selectedWorkshopId}
              onChange={(e) => setSelectedWorkshopId(e.target.value)}
              className="mt-2 input-field w-full sm:max-w-xs"
            >
              {workshops.map((workshop: Workshop) => (
                <option key={workshop.id} value={workshop.id}>
                  {workshop.name}
                  {workshop.isVip && ' ⭐'}
                  {workshop.maxCapacity && ` (Max: ${workshop.maxCapacity})`}
                </option>
              ))}
            </select>
          </div>

          {/* Notifications Stack */}
          <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full">
            {notifications.map((notification) => (
              <div
                key={notification.timestamp}
                className={`card p-4 shadow-lg animate-slide-up flex items-start justify-between ${
                  notification.type === 'success' 
                    ? 'bg-success-50 dark:bg-success-950/30 border-l-4 border-success-500' 
                    : 'bg-error-50 dark:bg-error-950/30 border-l-4 border-error-500'
                }`}
              >
                <div className="flex items-start">
                  <div className={`flex-shrink-0 ${
                    notification.type === 'success' 
                      ? 'text-success-500' 
                      : 'text-error-500'
                  }`}>
                    {notification.type === 'success' ? (
                      <Info className="h-5 w-5" />
                    ) : (
                      <CircleAlert className="h-5 w-5" />
                    )}
                  </div>
                  <p className={`ml-3 text-sm ${
                    notification.type === 'success' 
                      ? 'text-success-700 dark:text-success-400' 
                      : 'text-error-700 dark:text-error-400'
                  }`}>
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => removeNotification(notification.timestamp)}
                  className="ml-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden bg-neutral-900 dark:bg-neutral-800/50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2 px-4 py-2 bg-neutral-800 dark:bg-neutral-700 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${scannerActive ? 'bg-success-500 animate-pulse' : 'bg-neutral-600'}`} />
                  <span className="text-sm text-neutral-300">
                    {scannerActive ? 'Scanner Active - Ready to Scan' : 'Scanner Inactive'}
                  </span>
                </div>
                <button
                  onClick={toggleSound}
                  className="p-2 rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
                  title={soundEnabled ? 'Disable Sound' : 'Enable Sound'}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-neutral-400" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-neutral-400" />
                  )}
                </button>
              </div>
              
              <div className="w-full max-w-md mx-auto">
                {scannerActive && selectedWorkshopId ? (
                  <div className="relative">
                    <QRScanner 
                      key={scannerKey}
                      workshopId={selectedWorkshopId}
                      onSuccess={handleSuccess}
                      onError={handleError}
                      soundEnabled={soundEnabled}
                    />
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-primary-400/50 rounded-lg">
                          <div className="w-full h-full relative">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-400"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-400"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-400"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-400"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-[300px] flex items-center justify-center bg-neutral-800 dark:bg-neutral-700/50 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-48 h-48 border-2 border-neutral-600/50 rounded-lg">
                        <div className="w-full h-full relative">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neutral-500"></div>
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neutral-500"></div>
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neutral-500"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neutral-500"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center z-10">
                      <Camera size={48} className="text-neutral-500 mb-4" />
                      <p className="text-neutral-400 text-center">
                        Camera preview will<br />appear here
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex justify-center">
                  <button 
                    onClick={scannerActive ? () => setScannerActive(false) : startScanning}
                    className={`px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                      scannerActive
                        ? 'bg-error-600 hover:bg-error-700 text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }`}
                  >
                    {scannerActive ? (
                      <>
                        <CameraOff size={20} />
                        <span>Stop Scanning</span>
                      </>
                    ) : (
                      <>
                        <Camera size={20} />
                        <span>Start Scanning</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ScannerPage;
