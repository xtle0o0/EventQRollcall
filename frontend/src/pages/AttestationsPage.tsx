import { useState, useEffect } from 'react';
import { Download, Users, AlertCircle } from 'lucide-react';
import { Guest } from '../types';
import { 
  fetchGuests, 
  generateCertificate,
  getGuestAttendance, 
  calculateAttendancePercentage
} from '../api/apiService';

interface GuestWithAttendance extends Guest {
  hasAttended: boolean;
  attendancePercentage: number;
}

const AttestationsPage = () => {
  const [guests, setGuests] = useState<GuestWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGuests = async () => {
      try {
        setLoading(true);
        setError(null);
        const allGuests = await fetchGuests();
        
        // Get attendance info for each guest
        const guestsWithAttendance = await Promise.all(
          allGuests.map(async (guest) => {
            const attendance = await getGuestAttendance(guest.id);
            const percentage = await calculateAttendancePercentage(guest.id);
            return {
              ...guest,
              hasAttended: attendance && attendance.length > 0,
              attendancePercentage: percentage
            };
          })
        );
        
        setGuests(guestsWithAttendance);
        setLoading(false);
      } catch (err) {
        console.error("Error loading guests:", err);
        setError("Failed to load guests. Please try again.");
        setLoading(false);
      }
    };
    
    loadGuests();
  }, []);

  const downloadCertificate = async (guest: GuestWithAttendance) => {
    if (!guest.hasAttended) {
      setError(`Cannot generate certificate for ${guest.name}. They haven't attended any workshops.`);
      return;
    }
    
    try {
      const blob = await generateCertificate(guest.id, guest.name);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${guest.name.replace(/\\s+/g, '-')}.jpg`;
      
      // Append to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading certificate:', error);
      setError(error.message || 'Failed to download certificate. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Generate Certificates</h1>
        <p className="text-gray-600 dark:text-gray-400">Select a name to generate their certificate</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {guests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
          <div className="flex justify-center mb-4">
            <Users className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No guests found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            There are no guests in the system to generate certificates for.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guests.map((guest) => (
            <div 
              key={guest.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <span className="text-indigo-600 dark:text-indigo-300 font-medium text-lg">
                        {guest.name.charAt(0).toUpperCase()}
                      </span>
          </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{guest.name}</h3>
                    <p className={`text-sm ${guest.hasAttended ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {guest.hasAttended 
                        ? `${guest.attendancePercentage.toFixed(0)}% Attendance` 
                        : 'No workshops attended'}
                    </p>
                  </div>
                      </div>
                        <button
                  onClick={() => downloadCertificate(guest)}
                  disabled={!guest.hasAttended}
                  className={`ml-4 p-2 rounded-full ${
                    guest.hasAttended
                      ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  title={guest.hasAttended ? 'Download Certificate' : 'Cannot generate certificate - No attendance'}
                >
                  <Download className="h-5 w-5" />
                        </button>
              </div>
              </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttestationsPage;
