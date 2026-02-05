import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

interface Supplier {
  id: string;
  name: string;
  country: string;
}

interface Ingredient {
  id: string;
  name: string;
  sku: string;
}

interface PriceListItem {
  id: string;
  supplierId: string;
  ingredientId: string;
  price: number;
  currency: string;
  packSize: number;
  uom: string;
  effectiveDate: string; // ISO Date string
}

type View = 'dashboard' | 'suppliers' | 'pricelists' | 'ingredients' | 'recipecosting';

// --- Initial Mock Data ---

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'sup_1', name: 'Acme Foods', country: 'USA' },
  { id: 'sup_2', name: 'FreshCo', country: 'USA' },
  { id: 'sup_3', name: 'Mumbai Spices Ltd', country: 'IND' },
  { id: 'sup_4', name: 'Global Grains', country: 'CAN' },
  { id: 'sup_5', name: 'Pacific Seafoods', country: 'USA' },
];

const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'ing_1', name: 'Tomato', sku: 'TOM-001' },
  { id: 'ing_2', name: 'Garlic', sku: 'GAR-010' },
  { id: 'ing_3', name: 'Basmati Rice', sku: 'RIC-500' },
  { id: 'ing_4', name: 'Olive Oil', sku: 'OIL-EXT' },
  { id: 'ing_5', name: 'Chicken Breast', sku: 'CHK-BRS' },
  { id: 'ing_6', name: 'Cumin Seeds', sku: 'SP-CUM' },
  { id: 'ing_7', name: 'Red Onion', sku: 'VEG-ONI' },
  { id: 'ing_8', name: 'Heavy Cream', sku: 'DAIRY-HC' },
  { id: 'ing_9', name: 'Large Eggs', sku: 'DAIRY-EGG-12' },
  { id: 'ing_10', name: 'Salted Butter', sku: 'DAIRY-BUT-500' },
  { id: 'ing_11', name: 'Cheddar Cheese', sku: 'DAIRY-CH-BLK' },
  { id: 'ing_12', name: 'Spinach', sku: 'VEG-SPIN' },
];

const generateInitialPriceList = (count: number): PriceListItem[] => {
  const items: PriceListItem[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const supplier = INITIAL_SUPPLIERS[Math.floor(Math.random() * INITIAL_SUPPLIERS.length)];
    const ingredient = INITIAL_INGREDIENTS[Math.floor(Math.random() * INITIAL_INGREDIENTS.length)];
    
    const currency = supplier.country === 'IND' ? 'INR' : 'USD';
    const priceBase = Math.random() * 50 + 1;
    const price = currency === 'INR' ? priceBase * 83 : priceBase;

    const dateOffset = Math.floor(Math.random() * 60) - 30; 
    const date = new Date(now);
    date.setDate(date.getDate() + dateOffset);

    items.push({
      id: `pli_${i}`,
      supplierId: supplier.id,
      ingredientId: ingredient.id,
      price: parseFloat(price.toFixed(2)),
      currency: currency,
      packSize: Math.floor(Math.random() * 10) + 1,
      uom: ['kg', 'L', 'lb', 'oz'][Math.floor(Math.random() * 4)],
      effectiveDate: date.toISOString().split('T')[0],
    });
  }
  return items;
};

// --- Helper Components ---

const Header = () => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
            M
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">MenuWise</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-bell"></i>
          </button>
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium border border-gray-300">
            JD
          </div>
        </div>
      </div>
    </div>
  </header>
);

const Sidebar = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => {
  const navItem = (view: View, icon: string, label: string) => (
    <button 
      onClick={() => setView(view)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        currentView === view 
          ? 'bg-emerald-50 text-emerald-700 font-medium' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <i className={`fas ${icon} w-5 text-center`}></i>
      {label}
    </button>
  );

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)]">
      <div className="p-4 space-y-1">
        {navItem('dashboard', 'fa-chart-pie', 'Dashboard')}
        {navItem('suppliers', 'fa-truck', 'Suppliers')}
        {navItem('pricelists', 'fa-tags', 'Price Lists')}
        {navItem('ingredients', 'fa-carrot', 'Ingredients')}
        {navItem('recipecosting', 'fa-calculator', 'Recipe Costing')}
      </div>
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">Challenge Mode</h4>
          <p className="text-xs text-blue-600">
            UI now supports CSV Import with Task 2 logic (INR default for India).
          </p>
        </div>
      </div>
    </div>
  );
};

// --- View Components ---

const DashboardView = ({ 
  suppliers, 
  ingredients, 
  items,
  setView
}: { 
  suppliers: Supplier[], 
  ingredients: Ingredient[], 
  items: PriceListItem[],
  setView: (v: View) => void
}) => {
  const totalValue = items.reduce((acc, item) => acc + (item.currency === 'USD' ? item.price : item.price / 83), 0);
  const avgPrice = items.length ? totalValue / items.length : 0;
  
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your procurement data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div 
          onClick={() => setView('suppliers')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow group"
        >
          <div className="text-sm font-medium text-gray-500 mb-2 group-hover:text-emerald-600 transition-colors">Total Suppliers</div>
          <div className="text-3xl font-bold text-gray-900">{suppliers.length}</div>
          <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <i className="fas fa-arrow-up"></i> Active globally
          </div>
        </div>
        <div 
          onClick={() => setView('ingredients')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow group"
        >
          <div className="text-sm font-medium text-gray-500 mb-2 group-hover:text-emerald-600 transition-colors">Ingredients Tracked</div>
          <div className="text-3xl font-bold text-gray-900">{ingredients.length}</div>
          <div className="text-xs text-emerald-600 mt-2">Across {items.length} price points</div>
        </div>
        <div 
          onClick={() => setView('pricelists')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow group"
        >
          <div className="text-sm font-medium text-gray-500 mb-2 group-hover:text-emerald-600 transition-colors">Avg. Item Price (est)</div>
          <div className="text-3xl font-bold text-gray-900">${avgPrice.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-2">Normalized to USD</div>
        </div>
        <div 
          onClick={() => setView('pricelists')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow group"
        >
            <div className="text-sm font-medium text-gray-500 mb-2 group-hover:text-emerald-600 transition-colors">Total Price Records</div>
            <div className="text-3xl font-bold text-gray-900">{items.length}</div>
            <div className="text-xs text-blue-600 mt-2">Updated recently</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-lg font-bold text-gray-900">Recent Suppliers</h3>
           <button onClick={() => setView('suppliers')} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.slice(-5).reverse().map(s => (
                <tr key={s.id} onClick={() => setView('suppliers')} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.country === 'IND' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                      {s.country}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-mono">{s.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 text-right"><i className="fas fa-chevron-right"></i></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SuppliersView = ({ 
  suppliers, 
  setSuppliers, 
  items, 
  ingredients 
}: { 
  suppliers: Supplier[], 
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>, 
  items: PriceListItem[], 
  ingredients: Ingredient[] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter Logic
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add Supplier Form State
  const [newSupName, setNewSupName] = useState('');
  const [newSupCountry, setNewSupCountry] = useState('USA');

  const handleAddSupplier = () => {
    if(!newSupName) return;
    const newSup: Supplier = {
      id: `sup_new_${Date.now()}`,
      name: newSupName,
      country: newSupCountry
    };
    setSuppliers([...suppliers, newSup]);
    setIsAddModalOpen(false);
    setNewSupName('');
    setNewSupCountry('USA');
  };

  const getSupplierStats = (id: string) => {
    const supplierItems = items.filter(i => i.supplierId === id);
    const uniqueIngs = new Set(supplierItems.map(i => i.ingredientId)).size;
    return { count: supplierItems.length, unique: uniqueIngs, items: supplierItems };
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 mt-1">Directory of all registered ingredient suppliers.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors"
        >
          <i className="fas fa-plus"></i>
          Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
        <input 
          type="text" 
          placeholder="Search by name or country code..." 
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Name</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provided Items</th>
               <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSuppliers.map(s => {
              const stats = getSupplierStats(s.id);
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                            <i className="fas fa-building"></i>
                        </div>
                        {s.name}
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.country === 'IND' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {s.country}
                       </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stats.unique} Ingredients
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => setSelectedSupplier(s)}
                        className="text-emerald-600 hover:text-emerald-900 px-3 py-1 rounded hover:bg-emerald-50 transition-colors"
                      >
                        Details
                      </button>
                   </td>
                </tr>
              )
            })}
            {filteredSuppliers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No suppliers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
             <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Supplier</h3>
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                   <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newSupName}
                      onChange={(e) => setNewSupName(e.target.value)}
                      placeholder="e.g. Global Foods Inc."
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
                   <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newSupCountry}
                      onChange={(e) => setNewSupCountry(e.target.value)}
                   >
                     <option value="USA">USA</option>
                     <option value="IND">IND</option>
                     <option value="CAN">CAN</option>
                     <option value="GBR">GBR</option>
                     <option value="FRA">FRA</option>
                   </select>
                </div>
             </div>
             <div className="mt-6 flex justify-end gap-3">
               <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
               >
                 Cancel
               </button>
               <button 
                  onClick={handleAddSupplier}
                  disabled={!newSupName}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Create Supplier
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-fade-in">
              <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                 <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedSupplier.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                       <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${selectedSupplier.country === 'IND' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {selectedSupplier.country}
                       </span>
                       <span className="text-sm text-gray-500 font-mono">{selectedSupplier.id}</span>
                    </div>
                 </div>
                 <button onClick={() => setSelectedSupplier(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fas fa-times text-xl"></i>
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                 <h4 className="font-semibold text-gray-900 mb-3">Supplied Ingredients</h4>
                 {getSupplierStats(selectedSupplier.id).items.length > 0 ? (
                   <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                           <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pack</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-200">
                            {getSupplierStats(selectedSupplier.id).items.map(i => {
                               const ing = ingredients.find(ing => ing.id === i.ingredientId);
                               return (
                                 <tr key={i.id}>
                                    <td className="px-4 py-2 text-sm text-gray-900">{ing?.name || i.ingredientId}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{i.packSize} {i.uom}</td>
                                    <td className="px-4 py-2 text-sm text-right font-mono">
                                       {i.currency} {i.price.toFixed(2)}
                                    </td>
                                 </tr>
                               )
                            })}
                         </tbody>
                      </table>
                   </div>
                 ) : (
                    <p className="text-gray-500 italic">No price lists associated with this supplier yet.</p>
                 )}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
                  <button onClick={() => setSelectedSupplier(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                     Close
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const IngredientsView = ({ ingredients, items, suppliers }: { ingredients: Ingredient[], items: PriceListItem[], suppliers: Supplier[] }) => {
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ingredients</h1>
        <p className="text-gray-500 mt-1">Master list of all ingredients and SKUs.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ingredients.map(ing => {
            const count = items.filter(i => i.ingredientId === ing.id).length;
            return (
              <div 
                key={ing.id} 
                onClick={() => setSelectedIngredient(ing)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow group cursor-pointer"
              >
                  <div className="flex justify-between items-start">
                      <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{ing.name}</h3>
                          <div className="text-sm text-gray-500 font-mono mt-1">{ing.sku}</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <i className="fas fa-leaf"></i>
                      </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                      <span className="text-gray-500">Available from</span>
                      <span className="font-medium text-gray-900">{count} Suppliers</span>
                  </div>
              </div>
            )
        })}
      </div>

      {selectedIngredient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-fade-in">
              <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                 <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedIngredient.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                       <span className="text-sm text-gray-500 font-mono">{selectedIngredient.sku}</span>
                    </div>
                 </div>
                 <button onClick={() => setSelectedIngredient(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fas fa-times text-xl"></i>
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                 <h4 className="font-semibold text-gray-900 mb-3">Available Suppliers</h4>
                 {items.filter(i => i.ingredientId === selectedIngredient.id).length > 0 ? (
                   <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                           <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pack</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-200">
                            {items.filter(i => i.ingredientId === selectedIngredient.id).map(i => {
                               const supplier = suppliers.find(s => s.id === i.supplierId);
                               return (
                                 <tr key={i.id}>
                                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">{supplier?.name || 'Unknown'}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${supplier?.country === 'IND' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {supplier?.country || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{i.packSize} {i.uom}</td>
                                    <td className="px-4 py-2 text-sm text-right font-mono">
                                       {i.currency} {i.price.toFixed(2)}
                                    </td>
                                 </tr>
                               )
                            })}
                         </tbody>
                      </table>
                   </div>
                 ) : (
                    <p className="text-gray-500 italic">No suppliers found for this ingredient.</p>
                 )}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
                  <button onClick={() => setSelectedIngredient(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                     Close
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const RecipeCostingView = ({ ingredients, items }: { ingredients: Ingredient[], items: PriceListItem[] }) => {
    const [recipeItems, setRecipeItems] = useState<{ingredientId: string, qty: number}[]>([
        { ingredientId: '', qty: 1 }
    ]);
    const [recipeName, setRecipeName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const addRow = () => setRecipeItems([...recipeItems, { ingredientId: '', qty: 1 }]);
    const removeRow = (idx: number) => setRecipeItems(recipeItems.filter((_, i) => i !== idx));
    const updateRow = (idx: number, field: 'ingredientId' | 'qty', value: any) => {
        const newItems = [...recipeItems];
        // @ts-ignore
        newItems[idx][field] = value;
        setRecipeItems(newItems);
    }

    const calculateRowCost = (ingredientId: string, qty: number) => {
        if (!ingredientId) return 0;
        // Find best price (simplistic: just find first match for demo)
        const priceItem = items.find(i => i.ingredientId === ingredientId);
        if (!priceItem) return 0;
        
        // Normalize to approx USD for calculation if INR
        let unitPrice = priceItem.price;
        if (priceItem.currency === 'INR') unitPrice = unitPrice / 83;
        
        // Simple linear calculation: (Price / PackSize) * Qty
        return (unitPrice / priceItem.packSize) * qty;
    };

    const handleGenerateRecipe = async () => {
        if (!recipeName.trim()) {
            alert("Please enter a recipe name first.");
            return;
        }
        
        setIsGenerating(true);
        try {
            // Prepare context with available ingredients and their UOMs
            const ingredientContext = ingredients.map(ing => {
                const priceItem = items.find(i => i.ingredientId === ing.id);
                const uom = priceItem ? priceItem.uom : 'units';
                return `"${ing.name}" (typical unit: ${uom})`;
            }).join(', ');

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `You are a kitchen assistant. Create a simple ingredient list for the recipe: "${recipeName}".
            
            IMPORTANT: You must ONLY use ingredients from the following available list if possible. Match the names exactly.
            Available Inventory: ${ingredientContext}
            
            If the recipe requires an ingredient NOT in the list, please OMIT it. We only want to cost what is in inventory.
            
            For each ingredient, provide the quantity based on the "typical unit" provided in the list.
            
            Return a JSON array of objects with these properties:
            - ingredientName (string, exact match from inventory)
            - quantity (number)
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                ingredientName: { type: Type.STRING },
                                quantity: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            });

            const generatedData = JSON.parse(response.text);
            
            if (generatedData && Array.isArray(generatedData)) {
                const newRows = generatedData.map((item: any) => {
                    const matchedIng = ingredients.find(ing => ing.name.toLowerCase() === item.ingredientName.toLowerCase());
                    if (matchedIng) {
                        return {
                            ingredientId: matchedIng.id,
                            qty: item.quantity
                        };
                    }
                    return null;
                }).filter(Boolean); // Remove nulls (unmatched ingredients)

                if (newRows.length > 0) {
                    setRecipeItems(newRows);
                } else {
                    alert("Could not find any matching ingredients in inventory for this recipe.");
                }
            }
        } catch (error) {
            console.error("AI Generation Error:", error);
            alert("Failed to generate recipe. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const totalCost = recipeItems.reduce((sum, item) => sum + calculateRowCost(item.ingredientId, item.qty), 0);

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Recipe Cost Calculator</h1>
                <p className="text-gray-500 mt-1">Estimate recipe costs based on current lowest supplier prices.</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                            placeholder="e.g. Tomato Soup"
                            value={recipeName}
                            onChange={(e) => setRecipeName(e.target.value)}
                        />
                        <button 
                            onClick={handleGenerateRecipe}
                            disabled={isGenerating || !recipeName}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                            {isGenerating ? (
                                <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                            ) : (
                                <><i className="fas fa-magic"></i> Auto-fill with AI</>
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Enter a name and let AI populate the ingredients from your inventory.</p>
                </div>

                <div className="space-y-4">
                    <div className="flex font-medium text-sm text-gray-500 border-b pb-2">
                        <div className="flex-1">Ingredient</div>
                        <div className="w-32 text-center">Quantity (Units)</div>
                        <div className="w-32 text-right">Est. Cost (USD)</div>
                        <div className="w-10"></div>
                    </div>
                    
                    {recipeItems.map((row, idx) => {
                        const cost = calculateRowCost(row.ingredientId, row.qty);
                        return (
                            <div key={idx} className="flex items-center gap-4">
                                <div className="flex-1">
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        value={row.ingredientId}
                                        onChange={(e) => updateRow(idx, 'ingredientId', e.target.value)}
                                    >
                                        <option value="">Select Ingredient...</option>
                                        {ingredients.map(ing => (
                                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-32">
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-sm"
                                        value={row.qty}
                                        onChange={(e) => updateRow(idx, 'qty', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="w-32 text-right font-mono text-sm">
                                    ${cost.toFixed(2)}
                                </div>
                                <div className="w-10 text-center">
                                    <button onClick={() => removeRow(idx)} className="text-gray-400 hover:text-red-500">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <button onClick={addRow} className="mt-4 text-emerald-600 font-medium text-sm hover:text-emerald-700 flex items-center gap-2">
                    <i className="fas fa-plus"></i> Add Ingredient
                </button>

                <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end items-center gap-4">
                    <span className="text-gray-500 font-medium">Total Estimated Cost:</span>
                    <span className="text-3xl font-bold text-gray-900">${totalCost.toFixed(2)}</span>
                </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex gap-3">
                    <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                    <p className="text-sm text-blue-700">
                        This calculator automatically finds the pricing from your Price Lists. 
                        INR prices are converted to USD at an approximate rate of 83 INR = 1 USD for estimation.
                        Cost is calculated as <code>(Price / Pack Size) * Quantity</code>.
                    </p>
                </div>
            </div>
        </div>
    );
}

// --- Main App Component ---

const App = () => {
  // --- Global State ---
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [allItems, setAllItems] = useState<PriceListItem[]>(() => generateInitialPriceList(150));
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // --- Import Logic ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    const headers = "Supplier Name,SKU,Item Name,Pack Size,UOM,Price,Currency,Effective Date,Country Code (Optional)";
    const row1 = "Mumbai Spices Ltd,SP-TUR,Turmeric Powder,1,kg,250,,2025-02-01,IND";
    const row2 = "Acme Foods,VEG-CAR,Carrots,5,kg,4.50,USD,2025-01-15,USA";
    const csvContent = "data:text/csv;charset=utf-8," + [headers, row1, row2].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "price_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const newItems: PriceListItem[] = [];
      const newSuppliers: Supplier[] = [];
      const newIngredients: Ingredient[] = [];

      const getVal = (row: string[], colName: string) => {
        const idx = headers.findIndex(h => h.includes(colName.toLowerCase()));
        return idx !== -1 ? row[idx]?.trim() : '';
      }

      for(let i=1; i<lines.length; i++) {
         if(!lines[i].trim()) continue;
         const row = lines[i].split(',');
         
         const supName = getVal(row, 'supplier');
         const sku = getVal(row, 'sku');
         const ingName = getVal(row, 'item name');
         const priceStr = getVal(row, 'price');
         let currency = getVal(row, 'currency');
         const date = getVal(row, 'date') || new Date().toISOString().split('T')[0];
         const countryCode = getVal(row, 'country') || 'USA'; 
         
         if (!supName || !sku || !priceStr) continue;

         let supplier = suppliers.find(s => s.name.toLowerCase() === supName.toLowerCase()) || 
                        newSuppliers.find(s => s.name.toLowerCase() === supName.toLowerCase());
         
         if (!supplier) {
             supplier = {
                 id: `sup_new_${Math.random().toString(36).substr(2, 9)}`,
                 name: supName,
                 country: countryCode.toUpperCase()
             };
             newSuppliers.push(supplier);
         }

         let ingredient = ingredients.find(ing => ing.sku.toLowerCase() === sku.toLowerCase()) ||
                          newIngredients.find(ing => ing.sku.toLowerCase() === sku.toLowerCase());
         
         if (!ingredient) {
             ingredient = {
                 id: `ing_new_${Math.random().toString(36).substr(2, 9)}`,
                 name: ingName || sku,
                 sku: sku
             };
             newIngredients.push(ingredient);
         }

         if (!currency) {
             currency = supplier.country === 'IND' ? 'INR' : 'USD';
         }

         newItems.push({
             id: `pli_new_${Math.random().toString(36).substr(2, 9)}`,
             supplierId: supplier.id,
             ingredientId: ingredient.id,
             price: parseFloat(priceStr),
             currency: currency,
             packSize: parseFloat(getVal(row, 'pack')) || 1,
             uom: getVal(row, 'uom') || 'unit',
             effectiveDate: date
         });
      }

      if (newSuppliers.length > 0) setSuppliers(prev => [...prev, ...newSuppliers]);
      if (newIngredients.length > 0) setIngredients(prev => [...prev, ...newIngredients]);
      setAllItems(prev => [...newItems, ...prev]);

      alert(`Imported ${newItems.length} prices. Added ${newSuppliers.length} new suppliers and ${newIngredients.length} new ingredients.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  }

  const renderContent = () => {
      switch(currentView) {
          case 'dashboard': return <DashboardView suppliers={suppliers} ingredients={ingredients} items={allItems} setView={setCurrentView} />;
          case 'suppliers': return <SuppliersView suppliers={suppliers} setSuppliers={setSuppliers} items={allItems} ingredients={ingredients} />;
          case 'ingredients': return <IngredientsView ingredients={ingredients} items={allItems} suppliers={suppliers} />;
          case 'recipecosting': return <RecipeCostingView ingredients={ingredients} items={allItems} />;
          case 'pricelists': 
          default: 
            return (
                <PriceListTableView 
                    allItems={allItems} 
                    suppliers={suppliers} 
                    ingredients={ingredients} 
                    onImportClick={handleImportClick}
                    onDownloadTemplate={handleDownloadTemplate}
                    fileInputRef={fileInputRef}
                    onFileChange={handleFileChange}
                />
            );
      }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar currentView={currentView} setView={setCurrentView} />
        <main className="flex-1 flex flex-col bg-gray-50 overflow-y-auto h-[calc(100vh-64px)]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// --- Refactored Price List Table (now a sub-component) ---

interface PriceListTableViewProps {
    allItems: PriceListItem[];
    suppliers: Supplier[];
    ingredients: Ingredient[];
    onImportClick: () => void;
    onDownloadTemplate: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PriceListTableView = ({ allItems, suppliers, ingredients, onImportClick, onDownloadTemplate, fileInputRef, onFileChange }: PriceListTableViewProps) => {
  const [displayedItems, setDisplayedItems] = useState<PriceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      let filtered = allItems;

      if (selectedSupplier) {
        filtered = filtered.filter(i => i.supplierId === selectedSupplier);
      }
      if (selectedIngredient) {
        filtered = filtered.filter(i => i.ingredientId === selectedIngredient);
      }
      if (dateStart) {
        filtered = filtered.filter(i => i.effectiveDate >= dateStart);
      }
      if (dateEnd) {
        filtered = filtered.filter(i => i.effectiveDate <= dateEnd);
      }
      if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(i => {
            const ing = ingredients.find(ing => ing.id === i.ingredientId);
            const sup = suppliers.find(s => s.id === i.supplierId);
            return ing?.name.toLowerCase().includes(lowerQ) || 
                   ing?.sku.toLowerCase().includes(lowerQ) || 
                   sup?.name.toLowerCase().includes(lowerQ);
        });
      }

      setDisplayedItems(filtered);
      setIsLoading(false);
      setCurrentPage(1); 
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedSupplier, selectedIngredient, dateStart, dateEnd, searchQuery, allItems, suppliers, ingredients]);

  const totalPages = Math.ceil(displayedItems.length / itemsPerPage);
  const paginatedItems = displayedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown';
  const getSupplierCountry = (id: string) => suppliers.find(s => s.id === id)?.country || '';
  const getIngredient = (id: string) => ingredients.find(i => i.id === id);

  return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Price Lists</h1>
            <p className="text-gray-500 mt-1">Manage and track ingredient prices across all suppliers.</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={onDownloadTemplate}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-gray-50 transition-colors text-sm"
            >
                <i className="fas fa-file-csv mr-2"></i>
                Download Template
            </button>
            <button 
                onClick={onImportClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors"
            >
                <i className="fas fa-cloud-upload-alt"></i>
                Import CSV
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileChange} 
                accept=".csv" 
                className="hidden" 
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="SKU, Name..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Supplier</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ingredient</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                value={selectedIngredient}
                onChange={(e) => setSelectedIngredient(e.target.value)}
              >
                <option value="">All Ingredients</option>
                {ingredients.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                 <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                 <input 
                    type="date" 
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                 />
              </div>
              <div className="flex-1">
                 <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To</label>
                 <input 
                    type="date" 
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                 />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
               <i className="fas fa-spinner fa-spin text-3xl mb-3"></i>
               <p>Loading prices...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU / Ingredient</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pack Size</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedItems.length > 0 ? paginatedItems.map((item) => {
                      const ingredient = getIngredient(item.ingredientId);
                      const supplierName = getSupplierName(item.supplierId);
                      const country = getSupplierCountry(item.supplierId);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{ingredient?.name || 'Unknown Item'}</span>
                              <span className="text-xs text-gray-500 font-mono">{ingredient?.sku || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center">
                                <span className="text-sm text-gray-700">{supplierName}</span>
                                {country === 'IND' && (
                                   <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">IND</span>
                                )}
                             </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.packSize} {item.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${item.currency === 'INR' ? 'bg-orange-50 text-orange-800 border border-orange-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                              {item.currency} {item.price.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.effectiveDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-emerald-600 hover:text-emerald-900 mr-3">Edit</button>
                            <button className="text-red-600 hover:text-red-900">
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <i className="fas fa-inbox text-4xl mb-3 block text-gray-300"></i>
                          No price lists found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{Math.min(displayedItems.length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="font-medium">{Math.min(displayedItems.length, currentPage * itemsPerPage)}</span> of <span className="font-medium">{displayedItems.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <i className="fas fa-chevron-left h-5 w-5 flex items-center justify-center"></i>
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                         let pNum = i + 1;
                         if (totalPages > 5 && currentPage > 3) {
                            pNum = currentPage - 3 + i;
                            if (pNum > totalPages) pNum = i + (totalPages - 4);
                         }
                         
                         return (
                            <button
                              key={pNum}
                              onClick={() => setCurrentPage(pNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pNum 
                                  ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600' 
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pNum}
                            </button>
                         )
                      })}

                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <i className="fas fa-chevron-right h-5 w-5 flex items-center justify-center"></i>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);