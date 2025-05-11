import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getWorkshops, getGuests, getAttendance, isEligibleForAttestation } from '../utils/dataUtils';
import { ArrowRight, Award, BookOpen, QrCode, Users, AlertCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

interface StatCardType {
  title: string;
  value: number;
  subtitle?: string;
  icon: JSX.Element;
  color: string;
  link: string;
}

const Dashboard = () => {
  const { user, hasRole } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalWorkshops: 0,
    totalGuests: 0,
    totalAttendance: 0,
    eligibleForAttestation: 0,
    vipWorkshops: 0,
    vipGuests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const workshops = await getWorkshops();
        const guests = await getGuests();
        const attendance = await getAttendance();
        
        // Calculate eligible guests - need to check each guest asynchronously
        let eligibleCount = 0;
        for (const guest of guests) {
          const isEligible = await isEligibleForAttestation(guest.id);
          if (isEligible) eligibleCount++;
        }
        
        setStats({
          totalWorkshops: workshops.length,
          totalGuests: guests.length,
          totalAttendance: attendance.length,
          eligibleForAttestation: eligibleCount,
          vipWorkshops: workshops.filter(w => w.isVip).length,
          vipGuests: guests.filter(g => g.isVip).length
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // You might want to display an error message to the user
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Define stat cards based on user role
  const getStatCards = (): StatCardType[] => {
    // Basic cards for both roles
    const baseCards: StatCardType[] = [
      {
        title: 'Check-ins',
        value: stats.totalAttendance,
        icon: <QrCode size={24} className="text-purple-500" />,
        color: 'bg-purple-50 dark:bg-purple-900/20',
        link: '/scan'
      }
    ];
    
    // Admin-only cards
    const adminCards: StatCardType[] = [
      {
        title: 'Workshops',
        value: stats.totalWorkshops,
        subtitle: `${stats.vipWorkshops} VIP`,
        icon: <BookOpen size={24} className="text-blue-500" />,
        color: 'bg-blue-50 dark:bg-blue-900/20',
        link: '/workshops'
      },
      {
        title: 'Guests',
        value: stats.totalGuests,
        subtitle: `${stats.vipGuests} VIP`,
        icon: <Users size={24} className="text-green-500" />,
        color: 'bg-green-50 dark:bg-green-900/20',
        link: '/guests'
      },
      {
        title: 'Eligible for Attestation',
        value: stats.eligibleForAttestation,
        icon: <Award size={24} className="text-amber-500" />,
        color: 'bg-amber-50 dark:bg-amber-900/20',
        link: '/attestations'
      }
    ];

    return hasRole('admin') ? [...baseCards, ...adminCards] : baseCards;
  };

  // Define quick action buttons based on user role
  const getQuickActions = () => {
    // Basic actions for both roles
    const baseActions = [
      {
        title: 'Scan QR Code',
        icon: <QrCode size={32} className="mb-2" />,
        link: '/scan',
        color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
      }
    ];
    
    // Admin-only actions
    const adminActions = [
      {
        title: 'Manage Workshops',
        icon: <BookOpen size={32} className="mb-2" />,
        link: '/workshops',
        color: 'bg-blue-50 hover:bg-blue-100 text-blue-700'
      },
      {
        title: 'Manage Guests',
        icon: <Users size={32} className="mb-2" />,
        link: '/guests',
        color: 'bg-green-50 hover:bg-green-100 text-green-700'
      },
      {
        title: 'Generate Attestations',
        icon: <Award size={32} className="mb-2" />,
        link: '/attestations',
        color: 'bg-amber-50 hover:bg-amber-100 text-amber-700'
      }
    ];

    return hasRole('admin') ? [...baseActions, ...adminActions] : baseActions;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const statCards = getStatCards();
  const quickActions = getQuickActions();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome {user?.name}, you are logged in as{' '}
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user?.role}</span>
        </p>
      </div>

      {user?.role === 'scanner' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Scanner role can only scan QR codes. Contact the administrator if you need 
                access to additional features.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${
        hasRole('admin') ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-1'
      } gap-4 mb-8`}>
        {statCards.map((card, index) => (
          <div key={index} className={`${card.color} rounded-xl p-6 shadow-sm`}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{card.title}</h2>
                <p className="text-3xl font-bold dark:text-white">{card.value}</p>
                {card.subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.subtitle}</p>
                )}
              </div>
              <div className="rounded-full p-2 bg-white dark:bg-gray-800 shadow-sm">
                {card.icon}
              </div>
            </div>
            <div className="mt-4">
              <Link to={card.link} className="text-sm flex items-center font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                View details <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold dark:text-white mb-4">Quick Actions</h2>
        <div className={`grid grid-cols-1 ${
          hasRole('admin') ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-1'
        } gap-4`}>
          {quickActions.map((action, index) => (
            <Link 
              key={index}
              to={action.link} 
              className={`${action.color} rounded-lg p-4 flex flex-col items-center justify-center transition`}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {hasRole('admin') && stats.totalWorkshops === 0 && stats.totalGuests === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white mb-2">Getting Started</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Welcome to EventTrackr! Follow these steps to set up your event tracking:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Create workshops for your event</li>
            <li>Add guests to generate their QR codes</li>
            <li>Scan QR codes at each workshop to track attendance</li>
            <li>Generate attestations for guests who attended at least 70% of workshops</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
