import { useState, useEffect } from 'react';
import { Search, Trash2, AlertCircle } from 'lucide-react';
import { 
  fetchWorkshops, 
  fetchGuests, 
  fetchAttendance
} from '../api/apiService';

interface Workshop {
  id: string;
  name: string;
  date: string;
}

interface Guest {
  id: string;
  name: string;
  email: string;
}

interface AttendanceRecord {
  id: string;
  guestId: string;
  workshopId: string;
  timestamp: string;
}

const API_BASE_URL = 'http://161.35.163.90:3000/api';

const AttendancePage = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [workshopsData, guestsData, attendanceData] = await Promise.all([
          fetchWorkshops(),
          fetchGuests(),
          fetchAttendance()
        ]);
        setWorkshops(workshopsData);
        setGuests(guestsData);
        setAttendance(attendanceData);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const deleteAttendance = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete attendance record');
      }

      setAttendance(prev => prev.filter(record => record.id !== id));
    } catch (error) {
      console.error('Error deleting attendance:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete attendance record');
    }
  };

  const filteredAttendance = attendance.filter(record => {
    const guest = guests.find(g => g.id === record.guestId);
    const workshop = workshops.find(w => w.id === record.workshopId);
    const matchesSearch = (guest?.name.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (workshop?.name.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesWorkshop = selectedWorkshop === 'all' || record.workshopId === selectedWorkshop;
    return matchesSearch && matchesWorkshop;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">
          Attendance Management
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          View and manage workshop attendance records
        </p>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              placeholder="Search by guest or workshop name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          
          <select
            value={selectedWorkshop}
            onChange={(e) => setSelectedWorkshop(e.target.value)}
            className="input-field w-full sm:w-auto"
          >
            <option value="all">All Workshops</option>
            {workshops.map(workshop => (
              <option key={workshop.id} value={workshop.id}>
                {workshop.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-50 dark:bg-error-900/20 border-l-4 border-error-500 rounded">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-error-500" />
            <p className="ml-3 text-error-700 dark:text-error-400">{error}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
            <thead className="bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Guest
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Workshop
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredAttendance.map(record => {
                const guest = guests.find(g => g.id === record.guestId);
                const workshop = workshops.find(w => w.id === record.workshopId);
                return (
                  <tr key={record.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {guest?.name || 'Unknown Guest'}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {guest?.email || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900 dark:text-neutral-100">
                        {workshop?.name || 'Unknown Workshop'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {new Date(record.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => deleteAttendance(record.id)}
                        className="text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 transition-colors"
                        title="Delete attendance record"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage; 