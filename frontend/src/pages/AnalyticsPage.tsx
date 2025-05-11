import { useEffect, useState, useContext } from 'react';
import { Award, BookOpen, Calendar, CalendarDays, ChartBar, ClipboardCheck, SquareCheck, Users } from 'lucide-react';
import { Workshop, Guest, AttendanceRecord } from '../types';
import { ThemeContext } from '../context/ThemeContext';
import { 
  fetchWorkshops, 
  fetchGuests, 
  fetchAttendance, 
  isEligibleForAttestation, 
  calculateAttendancePercentage,
  getLastCheckIns
} from '../api/apiService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const GuestListItem = ({ guest, attendance, isSelected, onClick }: { 
  guest: Guest; 
  attendance: AttendanceRecord[];
  isSelected: boolean;
  onClick: () => void;
}) => {
  const [attendancePercent, setAttendancePercent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching attendance percentage for guest ${guest.id}`);
        const percent = await calculateAttendancePercentage(guest.id);
        
        if (isMounted) {
          console.log(`Guest ${guest.id} attendance percentage:`, percent);
          setAttendancePercent(percent);
          setLoading(false);
        }
      } catch (error) {
        console.error(`Error fetching attendance percentage for guest ${guest.id}:`, error);
        if (isMounted) {
          setAttendancePercent(0);
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [guest.id]);
  
  const attendedCount = attendance.filter((a: AttendanceRecord) => a.guestId === guest.id).length;
  
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
        isSelected
          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}
    >
      <div className="font-medium">{guest.name}</div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        {attendedCount} workshops attended • 
        {loading ? '...' : `${attendancePercent.toFixed(0)}%`} attendance
      </div>
    </button>
  );
};

const GuestAttendanceStats = ({ guestId, workshops }: { guestId: string | null, workshops: Workshop[] }) => {
  const [percentage, setPercentage] = useState<number>(0);
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!guestId) return;
    
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        console.log(`Fetching stats for guest ${guestId}`);
        
        // Fetch all required data in parallel
        const [percent, eligible, attendanceData] = await Promise.all([
          calculateAttendancePercentage(guestId),
          isEligibleForAttestation(guestId),
          fetchAttendance()
        ]);
        
        if (isMounted) {
          console.log(`Guest ${guestId} stats:`, {
            percentage: percent,
            eligible: eligible,
            attendanceCount: attendanceData.filter(record => record.guestId === guestId).length
          });
          
          setPercentage(percent);
          setIsEligible(eligible);
          setAttendance(attendanceData);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching guest stats:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [guestId]);
  
  if (!guestId) return null;
  if (loading) return <div className="p-4 text-center">Loading guest statistics...</div>;
  
  const attendedCount = attendance.filter((a: AttendanceRecord) => a.guestId === guestId).length;
  
  return (
    <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-750 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Overall Attendance Rate:</span>
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {percentage.toFixed(0)}%
          </div>
        </div>
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Workshops Attended:</span>
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {attendedCount} of {workshops.length}
          </div>
        </div>
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Attestation Status:</span>
          <div className={`text-lg font-medium ${
            isEligible ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'
          }`}>
            {isEligible ? 'Eligible' : 'Ineligible'}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsPage = () => {
  const { theme } = useContext(ThemeContext);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  // These states are set but not currently used in the UI
  // Keeping the setters for future functionality
  const [, setWorkshopAttendance] = useState<any[]>([]);
  const [, setAttestationData] = useState<any[]>([]);
  const [, setGuestAttendanceData] = useState<any[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workshops' | 'guests' | 'checkins'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalWorkshops: 0,
    totalGuests: 0,
    totalAttendance: 0,
    eligibleForAttestation: 0,
    percentAttended: 0,
    mostPopularWorkshop: { name: '', count: 0 },
    leastPopularWorkshop: { name: '', count: 0 },
    recentCheckins: [] as any[]
  });
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all necessary data from API
        const [workshopsData, guestsData] = await Promise.all([
          fetchWorkshops(),
          fetchGuests()
        ]);
        
        setWorkshops(workshopsData);
        setGuests(guestsData);
        
        // Then get attendance data and recent check-ins
        const [attendanceData, recentCheckinsData] = await Promise.all([
          fetchAttendance(),
          getLastCheckIns(5)
        ]);
        
        setAttendance(attendanceData);
        
        console.log("Loaded data:", {
          workshops: workshopsData.length,
          guests: guestsData.length,
          attendance: attendanceData.length
        });
        
        // Calculate attendance percentage per workshop
        const workshopStats = workshopsData.map(workshop => {
          const totalAttendees = attendanceData.filter(record => record.workshopId === workshop.id).length;
          const attendancePercentage = (totalAttendees / Math.max(guestsData.length, 1)) * 100;
          
          return {
            id: workshop.id,
            name: workshop.name,
            attendees: totalAttendees,
            percentage: parseFloat(attendancePercentage.toFixed(1))
          };
        });
        
        // Calculate attestation eligibility
        const eligibleGuests = [];
        for (const guest of guestsData) {
          try {
            const isEligible = await isEligibleForAttestation(guest.id);
            if (isEligible) {
              eligibleGuests.push(guest);
            }
          } catch (err) {
            console.error(`Error checking eligibility for guest ${guest.id}:`, err);
          }
        }
        
        const eligible = eligibleGuests.length;
        const ineligible = guestsData.length - eligible;
        
        const attestationStats = [
          { name: 'Eligible (≥70%)', value: eligible },
          { name: 'Ineligible (<70%)', value: ineligible }
        ];

        // Calculate attendance frequency distribution
        const guestAttendanceDistribution = [
          { name: '0%', count: 0 },
          { name: '1-25%', count: 0 },
          { name: '26-50%', count: 0 },
          { name: '51-75%', count: 0 },
          { name: '76-100%', count: 0 },
        ];
        
        for (const guest of guestsData) {
          try {
            const percent = await calculateAttendancePercentage(guest.id);
            if (percent === 0) {
              guestAttendanceDistribution[0].count++;
            } else if (percent <= 25) {
              guestAttendanceDistribution[1].count++;
            } else if (percent <= 50) {
              guestAttendanceDistribution[2].count++;
            } else if (percent <= 75) {
              guestAttendanceDistribution[3].count++;
            } else {
              guestAttendanceDistribution[4].count++;
            }
          } catch (err) {
            console.error(`Error calculating attendance for guest ${guest.id}:`, err);
          }
        }
        
        setWorkshopAttendance(workshopStats);
        setAttestationData(attestationStats);
        setGuestAttendanceData(guestAttendanceDistribution);
        
        // Set initial selections if data exists
        if (workshopsData.length > 0) {
          setSelectedWorkshop(workshopsData[0].id);
        }
        if (guestsData.length > 0) {
          setSelectedGuest(guestsData[0].id);
        }
        
        // Calculate stats for simple overview
        // Workshop popularity
        const workshopPopularity = workshopsData.map(workshop => {
          const attendeeCount = attendanceData.filter(a => a.workshopId === workshop.id).length;
          return {
            id: workshop.id,
            name: workshop.name,
            count: attendeeCount
          };
        }).sort((a, b) => b.count - a.count);
        
        // Get most/least popular workshops
        const mostPopular = workshopPopularity.length > 0 ? workshopPopularity[0] : { name: 'None', count: 0 };
        const leastPopular = workshopPopularity.length > 0 
          ? workshopPopularity[workshopPopularity.length - 1] 
          : { name: 'None', count: 0 };
        
        // Calculate overall attendance percentage
        let totalPossibleAttendance = guestsData.length * workshopsData.length;
        const percentAttended = totalPossibleAttendance > 0 
          ? (attendanceData.length / totalPossibleAttendance) * 100 
          : 0;
        
        // Format recent check-ins
        const formattedCheckins = recentCheckinsData.map(checkin => {
          // The API might be returning different field names than we're expecting
          // Handle field name differences: guest_id/guestId and workshop_id/workshopId
          const guestId = checkin.guestId || checkin.guest_id;
          const workshopId = checkin.workshopId || checkin.workshop_id;
          
          const guest = guestsData.find(g => g.id === guestId);
          const workshop = workshopsData.find(w => w.id === workshopId);
          
          return {
            id: checkin.id,
            guestId: guestId,
            workshopId: workshopId,
            guestName: guest ? guest.name : `Unknown (ID: ${guestId})`,
            workshopName: workshop ? workshop.name : `Unknown Workshop (ID: ${workshopId})`,
            timestamp: checkin.timestamp
          };
        });
        
        setStats({
          totalWorkshops: workshopsData.length,
          totalGuests: guestsData.length,
          totalAttendance: attendanceData.length,
          eligibleForAttestation: eligible,
          percentAttended: parseFloat(percentAttended.toFixed(1)),
          mostPopularWorkshop: mostPopular,
          leastPopularWorkshop: leastPopular,
          recentCheckins: formattedCheckins
        });

        setLoading(false);
      } catch (err) {
        console.error("Error loading analytics data:", err);
        setError("Failed to load analytics data. Please try again.");
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatFullDateTime = (dateString: string) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get workshop attendees
  const getWorkshopAttendeesData = (workshopId: string) => {
    if (!workshopId || !workshops.length || !guests.length) {
      return [];
    }
    
    const attendanceRecords = attendance.filter((record: AttendanceRecord) => record.workshopId === workshopId);
    
    return attendanceRecords.map((record: AttendanceRecord) => {
      const guest = guests.find((g: Guest) => g.id === record.guestId);
      
      if (!guest) {
        console.warn(`Guest with id ${record.guestId} not found for attendance record ${record.id}`);
      }
      
      return {
        id: record.id,
        guestId: record.guestId,
        guestName: guest ? guest.name : `Unknown (ID: ${record.guestId})`,
        email: guest ? guest.email : '',
        timestamp: record.timestamp
      };
    });
  };
  
  // Get guest workshop attendance
  const getGuestWorkshopsData = (guestId: string) => {
    if (!guestId || !workshops.length || !guests.length) {
      return [];
    }
    
    const attendanceRecords = attendance.filter((record: AttendanceRecord) => record.guestId === guestId);
    
    return attendanceRecords.map((record: AttendanceRecord) => {
      const workshop = workshops.find((w: Workshop) => w.id === record.workshopId);
      
      if (!workshop) {
        console.warn(`Workshop with id ${record.workshopId} not found for attendance record ${record.id}`);
      }
      
      return {
        id: record.id,
        workshopId: record.workshopId,
        workshopName: workshop ? workshop.name : `Unknown Workshop (ID: ${record.workshopId})`,
        date: workshop ? workshop.date : '',
        location: workshop ? workshop.location : '',
        timestamp: record.timestamp
      };
    });
  };

  // Simple overview stat card component
  const StatCard = ({ title, value, icon, color, subtext }: any) => (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
          {subtext && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 dark:bg-error-950/50 border-l-4 border-error-500 p-4 rounded-md">
        <div className="flex">
          <div className="ml-3">
            <p className="text-error-700 dark:text-error-300">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-error-600 hover:bg-error-700 text-white rounded-md"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">Analytics</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Event attendance insights and performance metrics</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 card p-1">
        <div className="flex flex-wrap border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'overview'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('workshops')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'workshops'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Workshops
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'guests'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Guests
          </button>
          <button
            onClick={() => setActiveTab('checkins')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'checkins'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Check-ins
          </button>
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard 
              title="Total Workshops" 
              value={stats.totalWorkshops} 
              icon={<Calendar size={24} className="text-primary-500 dark:text-primary-400" />}
              color="bg-primary-50 dark:bg-primary-900/20"
            />
            
            <StatCard 
              title="Total Guests" 
              value={stats.totalGuests} 
              icon={<Users size={24} className="text-success-500 dark:text-success-400" />}
              color="bg-success-50 dark:bg-success-900/20"
            />
            
            <StatCard 
              title="Total Check-ins" 
              value={stats.totalAttendance} 
              icon={<SquareCheck size={24} className="text-secondary-500 dark:text-secondary-400" />}
              color="bg-secondary-50 dark:bg-secondary-900/20"
            />

            <StatCard 
              title="Overall Attendance Rate" 
              value={`${stats.percentAttended}%`} 
              icon={<ChartBar size={24} className="text-primary-500 dark:text-primary-400" />}
              color="bg-primary-50 dark:bg-primary-900/20"
              subtext="Percentage of all possible check-ins"
            />
            
            <StatCard 
              title="Eligible for Attestation" 
              value={stats.eligibleForAttestation} 
              icon={<Award size={24} className="text-warning-500 dark:text-warning-400" />}
              color="bg-warning-50 dark:bg-warning-900/20"
              subtext={stats.totalGuests > 0 ? 
                `${Math.round((stats.eligibleForAttestation / stats.totalGuests) * 100)}% of guests` : 
                'No guests registered'}
            />

            <StatCard 
              title="Most Popular Workshop" 
              value={stats.mostPopularWorkshop.name || 'None'} 
              icon={<BookOpen size={24} className="text-secondary-500 dark:text-secondary-400" />}
              color="bg-secondary-50 dark:bg-secondary-900/20"
              subtext={stats.mostPopularWorkshop.count > 0 ? 
                `${stats.mostPopularWorkshop.count} attendees` : 
                'No attendance recorded'}
            />
          </div>

          {/* Workshop Attendance Chart */}
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4 flex items-center">
              <ChartBar size={20} className="text-primary-500 mr-2" />
              Workshop Attendance Overview
            </h2>
            
            <div className="h-[400px] relative">
              <Bar
                data={{
                  labels: workshops.map(w => w.name),
                  datasets: [
                    {
                      label: 'Number of Attendees',
                      data: workshops.map(workshop => 
                        attendance.filter(a => a.workshopId === workshop.id).length
                      ),
                      backgroundColor: 'rgba(99, 102, 241, 0.5)',
                      borderColor: 'rgb(99, 102, 241)',
                      borderWidth: 1,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                      }
                    },
                    title: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                        stepSize: 1
                      },
                      grid: {
                        color: theme === 'dark' ? 'rgba(243, 244, 246, 0.1)' : 'rgba(31, 41, 55, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="card p-6 mb-8">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4 flex items-center">
              <ClipboardCheck size={20} className="text-primary-500 mr-2" />
              Recent Check-ins
            </h2>
            
            {stats.recentCheckins.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className="bg-neutral-50 dark:bg-neutral-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Guest
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Workshop
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {stats.recentCheckins.map((checkin) => (
                      <tr key={checkin.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {checkin.guestName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                          {checkin.workshopName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                          {formatFullDateTime(checkin.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No check-ins recorded yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workshops Tab Content */}
      {activeTab === 'workshops' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Workshop List */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <Calendar size={20} className="text-primary-500 mr-2" />
              <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Workshops</h2>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto px-1">
              {workshops.map(workshop => (
                <button
                  key={workshop.id}
                  onClick={() => setSelectedWorkshop(workshop.id)}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedWorkshop === workshop.id
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="font-medium">{workshop.name}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDate(workshop.date)} • {attendance.filter(a => a.workshopId === workshop.id).length} attendees
                  </div>
                </button>
              ))}
              
              {workshops.length === 0 && (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No workshops available
                </div>
              )}
            </div>
          </div>
          
          {/* Workshop Attendees */}
          <div className="card p-6 lg:col-span-3">
            {selectedWorkshop ? (
              <>
                <div className="flex items-center mb-4">
                  <Users size={20} className="text-primary-500 mr-2" />
                  <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                    {workshops.find(w => w.id === selectedWorkshop)?.name} - Attendees
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Guest Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Check-in Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {getWorkshopAttendeesData(selectedWorkshop).map(attendee => (
                        <tr key={attendee.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">{attendee.guestName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-neutral-500 dark:text-neutral-400">{attendee.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-neutral-500 dark:text-neutral-400">
                              {formatDate(attendee.timestamp)} at {formatTime(attendee.timestamp)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {getWorkshopAttendeesData(selectedWorkshop).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
                            No attendees for this workshop yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
                Select a workshop to view attendees
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guests Tab Content */}
      {activeTab === 'guests' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Guest List */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <Users size={20} className="text-primary-500 mr-2" />
              <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Guests</h2>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto px-1">
              {guests.map((guest) => (
                <GuestListItem
                  key={guest.id}
                  guest={guest}
                  attendance={attendance}
                  isSelected={selectedGuest === guest.id}
                  onClick={() => setSelectedGuest(guest.id)}
                />
              ))}
              
              {guests.length === 0 && (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No guests available
                </div>
              )}
            </div>
          </div>
          
          {/* Guest Workshop Attendance */}
          <div className="card p-6 lg:col-span-3">
            {selectedGuest ? (
              <>
                <div className="flex items-center mb-4">
                  <CalendarDays size={20} className="text-primary-500 mr-2" />
                  <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                    {guests.find(g => g.id === selectedGuest)?.name || 'Unknown'} - Workshop Attendance
                  </h2>
                </div>
                
                <GuestAttendanceStats guestId={selectedGuest} workshops={workshops} />
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Workshop Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Location
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Check-in Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {getGuestWorkshopsData(selectedGuest).map(record => (
                        <tr key={record.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">{record.workshopName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-neutral-500 dark:text-neutral-400">{formatDate(record.date)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-neutral-500 dark:text-neutral-400">{record.location}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-neutral-500 dark:text-neutral-400">
                              {formatTime(record.timestamp)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {getGuestWorkshopsData(selectedGuest).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
                            This guest hasn't attended any workshops yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
                Select a guest to view workshop attendance
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-ins Tab Content */}
      {activeTab === 'checkins' && (
        <div className="card p-6">
          <div className="flex items-center mb-6">
            <ClipboardCheck size={20} className="text-primary-500 mr-2" />
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Recent Check-ins</h2>
          </div>
          
          {/* Add debug info */}
          {stats.recentCheckins.length > 0 && stats.recentCheckins.some(c => !c.guestName.includes('Unknown') && !c.workshopName.includes('Unknown')) ? null : (
            <div className="bg-warning-50 dark:bg-warning-900/20 border-l-4 border-warning-400 dark:border-warning-600 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-warning-700 dark:text-warning-300">
                    Some check-ins have missing guest or workshop information. This could be due to:
                  </p>
                  <ul className="mt-2 list-disc list-inside text-sm text-warning-700 dark:text-warning-300">
                    <li>Check-ins for guests or workshops that were deleted</li>
                    <li>API response format differences</li>
                    <li>Data synchronization issues</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
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
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    IDs
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {[...attendance]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map(record => {
                    const guest = guests.find(g => g.id === record.guestId);
                    const workshop = workshops.find(w => w.id === record.workshopId);
                    
                    return (
                      <tr key={record.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">
                            {guest ? guest.name : 'Unknown Guest'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-neutral-900 dark:text-neutral-100">
                            {workshop ? workshop.name : 'Unknown Workshop'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-neutral-500 dark:text-neutral-400">
                            {formatDate(record.timestamp)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-neutral-500 dark:text-neutral-400">
                            {formatTime(record.timestamp)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            Guest: {record.guestId}<br />
                            Workshop: {record.workshopId}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                
                {attendance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
                      No check-ins recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
