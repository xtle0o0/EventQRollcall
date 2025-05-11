import { useState, useEffect } from 'react';
import { Pencil, Plus, QrCode, Trash2, User, Star } from 'lucide-react';
import { Guest, Workshop } from '../types';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { 
  fetchGuests, 
  createGuest, 
  updateGuest, 
  deleteGuest,
  fetchWorkshops,
  addVipAccess,
  removeVipAccess,
  getVipAccessList
} from '../api/apiService';

const GuestsPage = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guestVipWorkshops, setGuestVipWorkshops] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Guest>>({
    name: '',
    email: '',
    isVip: false
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeQR, setActiveQR] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [guestsList, workshopsList] = await Promise.all([
          fetchGuests(),
          fetchWorkshops()
        ]);
        setGuests(guestsList);
        setWorkshops(workshopsList.filter(w => w.isVip));
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Handle body scroll when modals are open
  useEffect(() => {
    // Prevent scrolling on the body when any modal is open
    if (isModalOpen || showQRModal || isVipModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup function to ensure body scroll is restored when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, showQRModal, isVipModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (editingId) {
        // Edit existing guest
        const existingGuest = guests.find((g: Guest) => g.id === editingId);
        if (!existingGuest) throw new Error("Guest not found");
        
        const updatedGuest = await updateGuest({ 
          id: existingGuest.id,
          name: formData.name || existingGuest.name,
          email: formData.email || existingGuest.email,
          isVip: formData.isVip ?? existingGuest.isVip,
          qr_code: existingGuest.qr_code,
          created_at: existingGuest.created_at,
          updated_at: existingGuest.updated_at
        });
        
        setGuests(guests.map((guest: Guest) => 
          guest.id === editingId ? updatedGuest : guest
        ));
        closeModal();
      } else {
        // Create new guest
        const newGuest = await createGuest({
          name: formData.name || '',
          email: formData.email || '',
          isVip: formData.isVip || false,
          created_at: new Date().toISOString()
        });
        
        setGuests([...guests, newGuest]);
        
        // Show QR code modal after creating guest
        setActiveQR(newGuest.qr_code);
        setShowQRModal(true);
        closeModal();
      }
    } catch (err) {
      console.error("Error saving guest:", err);
      setError("Failed to save guest. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (guest: Guest) => {
    setFormData({
      name: guest.name,
      email: guest.email,
      isVip: guest.isVip
    });
    setEditingId(guest.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this guest?')) {
      setLoading(true);
      setError(null);
      try {
        await deleteGuest(id);
        setGuests(guests.filter((guest: Guest) => guest.id !== id));
      } catch (err) {
        console.error("Error deleting guest:", err);
        setError("Failed to delete guest. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const showQRCode = (qrCode: string) => {
    setActiveQR(qrCode);
    setShowQRModal(true);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      name: '',
      email: '',
      isVip: false
    });
    setEditingId(null);
  };

  const closeQRModal = () => {
    setShowQRModal(false);
    setActiveQR(null);
  };

  // Find guest by QR code for display in modal
  const getGuestByQRCode = (qrCode: string): Guest | undefined => {
    return guests.find(g => g.qr_code === qrCode);
  };

  const openVipModal = async (guest: Guest) => {
    setSelectedGuest(guest);
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching VIP workshops for guest: ${guest.id}`);
      const vipWorkshops = await getVipAccessList(guest.id);
      console.log('Received VIP workshops:', vipWorkshops);
      setGuestVipWorkshops(vipWorkshops.map(w => w.id));
    } catch (error) {
      console.error('Error fetching VIP access:', error);
      setError('Failed to fetch VIP workshop access. Please try again.');
    } finally {
      setLoading(false);
      setIsVipModalOpen(true);
    }
  };

  const closeVipModal = () => {
    setSelectedGuest(null);
    setGuestVipWorkshops([]);
    setIsVipModalOpen(false);
  };

  const handleVipWorkshopToggle = async (workshopId: string) => {
    if (!selectedGuest) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log(`Toggling VIP access for guest ${selectedGuest.id} to workshop ${workshopId}`);
      
      if (guestVipWorkshops.includes(workshopId)) {
        console.log('Removing VIP access');
        await removeVipAccess(selectedGuest.id, workshopId);
        setGuestVipWorkshops(prev => prev.filter(id => id !== workshopId));
        console.log('VIP access removed successfully');
      } else {
        console.log('Adding VIP access');
        await addVipAccess(selectedGuest.id, workshopId);
        setGuestVipWorkshops(prev => [...prev, workshopId]);
        console.log('VIP access added successfully');
      }
    } catch (error) {
      console.error('Error updating VIP access:', error);
      setError(`Failed to update VIP access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Show loading or error states
  if (loading && guests.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error && guests.length === 0) {
    return (
      <div className="bg-error-50 dark:bg-error-950 border-l-4 border-error-500 p-4 rounded-md">
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
      {error && <div className="bg-error-50 dark:bg-error-950/50 border-l-4 border-error-500 text-error-700 dark:text-error-300 p-4 mb-4">{error}</div>}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">Guests</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Manage your event participants</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          disabled={loading}
        >
          <Plus size={18} className="mr-1" />
          Add Guest
        </button>
      </div>

      {guests.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary-50 dark:bg-primary-900/30 p-3">
              <User size={24} className="text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No guests yet</h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">
            Add guests to your event to start tracking their attendance
          </p>
          <button
            onClick={openModal}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={18} className="mr-1" />
            Add First Guest
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Date Added
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {guests.map((guest: Guest) => (
                  <tr key={guest.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">{guest.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-neutral-500 dark:text-neutral-400">{guest.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-neutral-500 dark:text-neutral-400">
                        {new Date(guest.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {guest.isVip && (
                        <button 
                          onClick={() => openVipModal(guest)}
                          className="text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300 mr-3"
                          title="Manage VIP Access"
                          aria-label="Manage VIP Access"
                        >
                          <Star size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => showQRCode(guest.qr_code)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mr-3"
                        title="View QR Code"
                        aria-label="View QR Code"
                        disabled={!guest.qr_code}
                      >
                        <QrCode size={18} />
                      </button>
                      <button 
                        onClick={() => handleEdit(guest)}
                        className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mr-3"
                        title="Edit Guest"
                        aria-label="Edit Guest"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(guest.id)}
                        className="text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300"
                        title="Delete Guest"
                        aria-label="Delete Guest"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Guest Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in" onClick={closeModal}>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity z-40">
              <div className="absolute inset-0 bg-neutral-900 opacity-75 dark:opacity-80"></div>
            </div>

            {/* Modal content */}
            <div 
              className="inline-block align-bottom card text-left overflow-hidden animate-slide-up sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50"
              onClick={(e) => e.stopPropagation()} 
            >
              <form onSubmit={handleSubmit}>
                <div className="p-6">
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                    {editingId ? 'Edit Guest' : 'Add New Guest'}
                  </h3>
                  
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Name*
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      required
                      className="input-field w-full"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="input-field w-full"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        id="isVip"
                        name="isVip"
                        checked={formData.isVip || false}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-700 rounded"
                      />
                      <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">VIP Guest</span>
                    </label>
                  </div>
                </div>
                
                <div className="bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 sm:px-6 flex flex-col sm:flex-row-reverse sm:gap-2">
                  <button
                    type="submit"
                    className="btn-primary w-full sm:w-auto"
                    disabled={loading}
                  >
                    {editingId ? 'Save Changes' : 'Create Guest'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-secondary mt-3 sm:mt-0 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && activeQR && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in" onClick={closeQRModal}>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity z-40">
              <div className="absolute inset-0 bg-neutral-900 opacity-75 dark:opacity-80"></div>
            </div>

            {/* Modal content */}
            <div 
              className="inline-block align-bottom card text-left overflow-hidden animate-slide-up sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50"
              onClick={(e) => e.stopPropagation()} 
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                  {getGuestByQRCode(activeQR)?.name || 'Guest'} QR Code
                </h3>
                
                {getGuestByQRCode(activeQR) && (
                  <div className="flex flex-col items-center">
                    <QRCodeGenerator 
                      value={activeQR} 
                      title={getGuestByQRCode(activeQR)?.name || 'Guest QR Code'} 
                    />
                    <p className="mt-4 text-neutral-600 dark:text-neutral-400 text-sm text-center">
                      Scan this code for check-in at the event
                    </p>
                  </div>
                )}
                
                {!getGuestByQRCode(activeQR) && (
                  <div className="text-center text-error-600 dark:text-error-400 py-4">
                    Error: QR code information not found
                  </div>
                )}
              </div>
              
              <div className="bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 sm:px-6 flex justify-end">
                <button
                  type="button"
                  onClick={closeQRModal}
                  className="btn-secondary sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIP Workshop Access Modal */}
      {isVipModalOpen && selectedGuest && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in" onClick={closeVipModal}>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity z-40">
              <div className="absolute inset-0 bg-neutral-900 opacity-75 dark:opacity-80"></div>
            </div>

            {/* Modal content */}
            <div 
              className="inline-block align-bottom card text-left overflow-hidden animate-slide-up sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50"
              onClick={(e) => e.stopPropagation()} 
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                  Manage VIP Access for {selectedGuest.name}
                </h3>
                
                {loading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                ) : workshops.length === 0 ? (
                  <p className="text-neutral-500 dark:text-neutral-400">No VIP workshops available.</p>
                ) : (
                  <div className="space-y-1">
                    {workshops.map(workshop => (
                      <label key={workshop.id} className="flex items-center p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                        <input
                          type="checkbox"
                          checked={guestVipWorkshops.includes(workshop.id)}
                          onChange={() => handleVipWorkshopToggle(workshop.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-700 rounded"
                          disabled={loading}
                        />
                        <span className="ml-2">
                          <span className="font-medium text-neutral-800 dark:text-neutral-200">{workshop.name}</span>
                          {workshop.maxCapacity && (
                            <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-2">
                              (Max: {workshop.maxCapacity})
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 sm:px-6 flex justify-end">
                <button
                  type="button"
                  onClick={closeVipModal}
                  className="btn-primary sm:w-auto"
                  disabled={loading}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestsPage;
