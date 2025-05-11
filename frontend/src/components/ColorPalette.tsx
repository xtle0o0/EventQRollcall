const ColorSwatch = ({ name, colors }: { name: string, colors: string[] }) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-2">{name}</h3>
      <div className="grid grid-cols-11 gap-1">
        {colors.map((color, index) => (
          <div key={index} className="flex flex-col">
            <div 
              className={`h-12 rounded-md ${color}`} 
              title={color.replace('bg-', '')}
            ></div>
            <span className="text-xs mt-1 text-center">{
              color.includes('-') ? color.split('-').pop() : ''
            }</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ColorPalette = () => {
  const colorCategories = [
    {
      name: 'Primary',
      colors: [
        'bg-primary-50', 'bg-primary-100', 'bg-primary-200', 'bg-primary-300', 
        'bg-primary-400', 'bg-primary-500', 'bg-primary-600', 'bg-primary-700', 
        'bg-primary-800', 'bg-primary-900', 'bg-primary-950'
      ]
    },
    {
      name: 'Secondary',
      colors: [
        'bg-secondary-50', 'bg-secondary-100', 'bg-secondary-200', 'bg-secondary-300', 
        'bg-secondary-400', 'bg-secondary-500', 'bg-secondary-600', 'bg-secondary-700', 
        'bg-secondary-800', 'bg-secondary-900', 'bg-secondary-950'
      ]
    },
    {
      name: 'Success',
      colors: [
        'bg-success-50', 'bg-success-100', 'bg-success-200', 'bg-success-300', 
        'bg-success-400', 'bg-success-500', 'bg-success-600', 'bg-success-700', 
        'bg-success-800', 'bg-success-900', 'bg-success-950'
      ]
    },
    {
      name: 'Warning',
      colors: [
        'bg-warning-50', 'bg-warning-100', 'bg-warning-200', 'bg-warning-300', 
        'bg-warning-400', 'bg-warning-500', 'bg-warning-600', 'bg-warning-700', 
        'bg-warning-800', 'bg-warning-900', 'bg-warning-950'
      ]
    },
    {
      name: 'Error',
      colors: [
        'bg-error-50', 'bg-error-100', 'bg-error-200', 'bg-error-300', 
        'bg-error-400', 'bg-error-500', 'bg-error-600', 'bg-error-700', 
        'bg-error-800', 'bg-error-900', 'bg-error-950'
      ]
    },
    {
      name: 'Neutral',
      colors: [
        'bg-neutral-50', 'bg-neutral-100', 'bg-neutral-200', 'bg-neutral-300', 
        'bg-neutral-400', 'bg-neutral-500', 'bg-neutral-600', 'bg-neutral-700', 
        'bg-neutral-800', 'bg-neutral-900', 'bg-neutral-950'
      ]
    }
  ];

  return (
    <div className="p-6 card">
      <h2 className="text-2xl font-bold mb-6">Color Palette</h2>
      <div className="space-y-6">
        {colorCategories.map((category, index) => (
          <ColorSwatch key={index} name={category.name} colors={category.colors} />
        ))}
      </div>
      
      <hr className="my-8 border-t border-neutral-200 dark:border-neutral-700" />
      
      <h2 className="text-2xl font-bold mb-6">UI Components</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Buttons</h3>
          <div className="flex flex-wrap gap-4">
            <button className="btn-primary">Primary Button</button>
            <button className="btn-secondary">Secondary Button</button>
            <button className="btn-primary" disabled>Disabled Button</button>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Form Elements</h3>
          <div className="flex flex-wrap gap-4">
            <input type="text" className="input-field" placeholder="Text input" />
            <select className="input-field">
              <option>Select dropdown</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
            <div className="flex items-center">
              <input type="checkbox" id="check" className="mr-2" />
              <label htmlFor="check">Checkbox</label>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <div className="card-header">
                <h3 className="font-medium">Card Title</h3>
              </div>
              <p>Card content goes here. This is how card components look in the design system.</p>
            </div>
            <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-900/50">
              <div className="card-header border-primary-200 dark:border-primary-800/50">
                <h3 className="font-medium text-primary-800 dark:text-primary-300">Themed Card</h3>
              </div>
              <p className="text-primary-700 dark:text-primary-300">A card with custom theme colors applied.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPalette; 