import { useState, useEffect } from 'react';
import { Calendar, Pencil, MapPin, Plus, Trash2 } from 'lucide-react';
import { Workshop } from '../types';
import { 
  fetchWorkshops, 
  createWorkshop, 
  updateWorkshop as apiUpdateWorkshop, 
  deleteWorkshop 
} from '../api/apiService';

const WorkshopsPage = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Workshop>>({
    name: '',
    description: '',
    date: '',
    location: '',
    isVip: false,
    maxCapacity: undefined
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkshops();
  }, []);

  const loadWorkshops = async () => {
    try {
      setLoading(true);
      setError(null);
      const workshopsData = await fetchWorkshops();
      setWorkshops(workshopsData);
    } catch (error) {
      console.error('Error fetching workshops:', error);
      setError('Failed to load workshops. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked
      });
    } else if (name === 'maxCapacity') {
      setFormData({
        ...formData,
        [name]: value ? parseInt(value) : undefined
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (editingId) {
        // Edit existing workshop
        const updatedWorkshop = await apiUpdateWorkshop({
          ...formData as Workshop,
          id: editingId
        });
        
        // Update local state
        setWorkshops(prevWorkshops => 
          prevWorkshops.map(workshop => 
            workshop.id === editingId ? updatedWorkshop : workshop
          )
        );
      } else {
        // Create new workshop
        const newWorkshopData = {
          name: formData.name || '',
          description: formData.description || '',
          date: formData.date || '',
          location: formData.location || '',
          isVip: formData.isVip || false,
          maxCapacity: formData.maxCapacity,
          createdAt: new Date().toISOString()
        };
        
        const newWorkshop = await createWorkshop(newWorkshopData);
        
        // Update local state
        setWorkshops(prevWorkshops => [...prevWorkshops, newWorkshop]);
      }
      
      closeModal();
    } catch (error) {
      console.error('Error saving workshop:', error);
      setError('Failed to save workshop. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (workshop: Workshop) => {
    setFormData(workshop);
    setEditingId(workshop.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this workshop?')) {
      try {
        setLoading(true);
        setError(null);
        await deleteWorkshop(id);
        // Update local state
        setWorkshops(prevWorkshops => prevWorkshops.filter(workshop => workshop.id !== id));
      } catch (error) {
        console.error('Error deleting workshop:', error);
        setError('Failed to delete workshop. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      name: '',
      description: '',
      date: '',
      location: '',
      isVip: false,
      maxCapacity: undefined
    });
    setEditingId(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading && workshops.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error && workshops.length === 0) {
    return (
      <div className="bg-error-50 dark:bg-error-950 border-l-4 border-error-500 p-4 rounded-md">
        <div className="flex">
          <div className="ml-3">
            <p className="text-error-700 dark:text-error-300">{error}</p>
            <button 
              onClick={loadWorkshops} 
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
      {error && 
        <div className="bg-error-50 dark:bg-error-950/50 border-l-4 border-error-500 text-error-700 dark:text-error-300 p-4 mb-4">
          {error}
        </div>
      }
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">Workshops</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Manage your event workshops</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          disabled={loading}
        >
          <Plus size={18} className="mr-1" />
          Add Workshop
        </button>
      </div>

      {workshops.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary-50 dark:bg-primary-900/20 p-3">
              <Calendar size={24} className="text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No workshops yet</h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">
            Create workshops for your event to start tracking attendance
          </p>
          <button
            onClick={openModal}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} className="mr-1" />
            Add First Workshop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workshops.map((workshop) => (
            <div key={workshop.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{workshop.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(workshop)}
                    className="p-1 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    aria-label="Edit workshop"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(workshop.id)}
                    className="p-1 text-neutral-500 hover:text-error-600 dark:hover:text-error-400 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    aria-label="Delete workshop"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {workshop.description && (
                <p className="text-neutral-600 dark:text-neutral-300 mb-4">{workshop.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center text-neutral-500 dark:text-neutral-400">
                  <Calendar size={16} className="mr-2" />
                  <span>{formatDate(workshop.date)}</span>
                </div>
                
                {workshop.location && (
                  <div className="flex items-center text-neutral-500 dark:text-neutral-400">
                    <MapPin size={16} className="mr-2" />
                    <span>{workshop.location}</span>
                  </div>
                )}

                {workshop.isVip && (
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300">
                    VIP Workshop
                  </div>
                )}

                {workshop.maxCapacity && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Max Capacity: {workshop.maxCapacity}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-md animate-slide-up">
            <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              {editingId ? 'Edit Workshop' : 'Add New Workshop'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    className="input-field w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</label>
                  <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    className="input-field w-full"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Date</label>
                  <input
                    type="datetime-local"
                    name="date"
                    value={formData.date || ''}
                    onChange={handleInputChange}
                    className="input-field w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location || ''}
                    onChange={handleInputChange}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Max Capacity</label>
                  <input
                    type="number"
                    name="maxCapacity"
                    value={formData.maxCapacity || ''}
                    onChange={handleInputChange}
                    className="input-field w-full"
                    min="1"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isVip"
                    id="isVip"
                    checked={formData.isVip || false}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-700 rounded"
                  />
                  <label htmlFor="isVip" className="ml-2 block text-sm text-neutral-700 dark:text-neutral-300">
                    VIP Workshop
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopsPage;
