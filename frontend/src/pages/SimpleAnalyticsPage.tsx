import { useState, useEffect } from 'react';
import { 
  getGuests, 
  getWorkshops, 
  getAttendance, 
  isEligibleForAttestation 
} from '../utils/dataUtils';
import { Award, BookOpen, Calendar, ChartBar, SquareCheck, Users } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
}

interface Stats {
  totalWorkshops: number;
  totalGuests: number;
  totalAttendance: number;
  eligibleForAttestation: number;
  percentAttended: number;
  mostPopularWorkshop: { name: string; count: number };
  leastPopularWorkshop: { name: string; count: number };
  recentCheckins: Array<{
    id: string;
    guestName: string;
    workshopName: string;
    timestamp: string;
  }>;
}

const SimpleAnalyticsPage = () => {
  const [stats, setStats] = useState<Stats>({
    totalWorkshops: 0,
    totalGuests: 0,
    totalAttendance: 0,
    eligibleForAttestation: 0,
    percentAttended: 0,
    mostPopularWorkshop: { name: '', count: 0 },
    leastPopularWorkshop: { name: '', count: 0 },
    recentCheckins: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workshops, guests, attendance] = await Promise.all([
          getWorkshops(),
          getGuests(),
          getAttendance()
        ]);
        
        // Calculate eligible guests
        const eligibleGuests = await Promise.all(
          guests.map(guest => isEligibleForAttestation(guest.id))
        );
        const eligibleCount = eligibleGuests.filter(Boolean).length;
        
        // Calculate overall attendance percentage
        let totalPossibleAttendance = guests.length * workshops.length;
        const percentAttended = totalPossibleAttendance > 0 
          ? (attendance.length / totalPossibleAttendance) * 100 
          : 0;
        
        // Calculate workshop popularity
        const workshopPopularity = workshops.map(workshop => {
          const attendeeCount = attendance.filter(a => a.workshopId === workshop.id).length;
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
        
        // Get recent check-ins
        const recentCheckins = [...attendance]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5)
          .map(checkin => {
            const guest = guests.find(g => g.id === checkin.guestId);
            const workshop = workshops.find(w => w.id === checkin.workshopId);
            return {
              id: checkin.id,
              guestName: guest ? guest.name : 'Unknown',
              workshopName: workshop ? workshop.name : 'Unknown',
              timestamp: checkin.timestamp
            };
          });
        
        setStats({
          totalWorkshops: workshops.length,
          totalGuests: guests.length,
          totalAttendance: attendance.length,
          eligibleForAttestation: eligibleCount,
          percentAttended: parseFloat(percentAttended.toFixed(1)),
          mostPopularWorkshop: mostPopular,
          leastPopularWorkshop: leastPopular,
          recentCheckins
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const options = {
      year: 'numeric' as const,
      month: 'short' as const,
      day: 'numeric' as const,
      hour: '2-digit' as const,
      minute: '2-digit' as const
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const StatCard = ({ title, value, icon, color, subtext }: StatCardProps) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {subtext && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Simple Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">Quick overview of your event's key metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Workshops" 
          value={stats.totalWorkshops} 
          icon={<Calendar size={24} className="text-blue-500" />}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        
        <StatCard 
          title="Total Guests" 
          value={stats.totalGuests} 
          icon={<Users size={24} className="text-green-500" />}
          color="bg-green-50 dark:bg-green-900/20"
        />
        
        <StatCard 
          title="Total Check-ins" 
          value={stats.totalAttendance} 
          icon={<SquareCheck size={24} className="text-purple-500" />}
          color="bg-purple-50 dark:bg-purple-900/20"
        />

        <StatCard 
          title="Overall Attendance Rate" 
          value={`${stats.percentAttended}%`} 
          icon={<ChartBar size={24} className="text-indigo-500" />}
          color="bg-indigo-50 dark:bg-indigo-900/20"
          subtext="Percentage of all possible check-ins"
        />
        
        <StatCard 
          title="Eligible for Attestation" 
          value={stats.eligibleForAttestation} 
          icon={<Award size={24} className="text-amber-500" />}
          color="bg-amber-50 dark:bg-amber-900/20"
          subtext={stats.totalGuests > 0 ? 
            `${Math.round((stats.eligibleForAttestation / stats.totalGuests) * 100)}% of guests` : 
            'No guests registered'}
        />

        <StatCard 
          title="Most Popular Workshop" 
          value={stats.mostPopularWorkshop.name || 'None'} 
          icon={<BookOpen size={24} className="text-cyan-500" />}
          color="bg-cyan-50 dark:bg-cyan-900/20"
          subtext={stats.mostPopularWorkshop.count > 0 ? 
            `${stats.mostPopularWorkshop.count} attendees` : 
            'No attendance recorded'}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Recent Check-ins</h2>
        
        {stats.recentCheckins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Guest
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Workshop
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {stats.recentCheckins.map((checkin) => (
                  <tr key={checkin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {checkin.guestName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {checkin.workshopName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(checkin.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No check-ins recorded yet
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleAnalyticsPage;
