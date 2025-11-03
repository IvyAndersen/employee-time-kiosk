import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, User, CheckCircle, Coffee } from 'lucide-react';

const EmployeeKiosk = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // HARDCODED n8n WEBHOOKS (history removed)
  const [config] = useState({
    n8nGetEmployeesUrl: 'https://primary-production-191cf.up.railway.app/webhook/get-employees',
    n8nClockInUrl: 'https://primary-production-191cf.up.railway.app/webhook/clock-in',
    n8nClockOutUrl: 'https://primary-production-191cf.up.railway.app/webhook/clock-out',
    n8nStartBreakUrl: 'https://primary-production-191cf.up.railway.app/webhook/start-break',
    n8nEndBreakUrl: 'https://primary-production-191cf.up.railway.app/webhook/end-break'
  });

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { timeZone: 'Europe/Oslo', hour12: false };
      
      const timeStr = now.toLocaleTimeString('en-NO', {
        ...options,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const dateStr = now.toLocaleDateString('en-NO', {
        ...options,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      setCurrentTime(timeStr);
      setCurrentDate(dateStr);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load employees on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(config.n8nGetEmployeesUrl);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      } else {
        console.error('Failed to fetch employees, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Fallback to hardcoded list if webhook not set up yet
      setEmployees([
        { id: '1', name: 'Annabelle Cazals', active: false, onBreak: false },
        { id: '2', name: 'Bohdan Zavhorodnii', active: false, onBreak: false },
        { id: '3', name: 'Elzbieta Karpinska', active: false, onBreak: false },
      ]);
    }
  };

  const post = (url, body) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  const handleClockIn = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await post(config.n8nClockInUrl, {
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        clockIn: new Date().toISOString()
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployee.id 
            ? { ...emp, active: true, onBreak: false, currentTimesheetId: data.timesheetId }
            : emp
        ));
        setSelectedEmployee({ ...selectedEmployee, active: true, onBreak: false, currentTimesheetId: data.timesheetId });
        setMessage('✓ Successfully clocked in!');
      } else {
        setMessage('✗ Error: Failed to clock in');
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleStartBreak = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await post(config.n8nStartBreakUrl, {
        timesheetId: selectedEmployee.currentTimesheetId,
        breakStart: new Date().toISOString()
      });
      if (response.ok) {
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployee.id 
            ? { ...emp, onBreak: true }
            : emp
        ));
        setSelectedEmployee({ ...selectedEmployee, onBreak: true });
        setMessage('✓ Break started!');
      } else {
        setMessage('✗ Error: Failed to start break');
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEndBreak = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await post(config.n8nEndBreakUrl, {
        timesheetId: selectedEmployee.currentTimesheetId,
        breakEnd: new Date().toISOString()
      });
      if (response.ok) {
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployee.id 
            ? { ...emp, onBreak: false }
            : emp
        ));
        setSelectedEmployee({ ...selectedEmployee, onBreak: false });
        setMessage('✓ Break ended!');
      } else {
        setMessage('✗ Error: Failed to end break');
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleClockOut = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await post(config.n8nClockOutUrl, {
        timesheetId: selectedEmployee.currentTimesheetId,
        clockOut: new Date().toISOString()
      });
      if (response.ok) {
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployee.id 
            ? { ...emp, active: false, onBreak: false, currentTimesheetId: null }
            : emp
        ));
        setSelectedEmployee({ ...selectedEmployee, active: false, onBreak: false, currentTimesheetId: null });
        setMessage('✓ Successfully clocked out!');
      } else {
        setMessage('✗ Error: Failed to clock out');
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Left Side - Employee List */}
      <div className="w-1/2 border-r border-gray-700 p-8 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Employees</h2>
          <p className="text-gray-400">Select your name to continue</p>
        </div>

        <div className="space-y-3">
          {employees.map((employee) => (
            <button
              key={employee.id}
              onClick={() => setSelectedEmployee(employee)}
              className={`
                w-full p-4 rounded-xl transition-all duration-200 text-left
                ${selectedEmployee?.id === employee.id
                  ? 'bg-emerald-600/30 border-2 border-emerald-500 scale-[1.02]'
                  : 'bg-gray-800/50 border-2 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-3 h-3 rounded-full flex-shrink-0
                    ${employee.onBreak ? 'bg-yellow-400 animate-pulse' :
                      employee.active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}
                  `} />
                  <span className="text-white font-medium">
                    {employee.name}
                  </span>
                </div>
                {employee.onBreak && (
                  <span className="text-yellow-400 text-xs font-medium">
                    On Break
                  </span>
                )}
                {employee.active && !employee.onBreak && (
                  <span className="text-emerald-400 text-xs font-medium">
                    Active
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Side - Clock In/Out */}
      <div className="w-1/2 p-8 flex flex-col overflow-y-auto">
        {/* Header with Time */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Clock className="w-10 h-10 text-emerald-500" />
            <h1 className="text-4xl font-bold text-white">Time Clock</h1>
          </div>
          
          {/* Real-time Clock */}
          <div className="bg-gray-800/50 rounded-2xl p-6 mb-4 border border-gray-700">
            <div className="text-6xl font-bold text-white mb-2 font-mono">
              {currentTime}
            </div>
            <div className="text-gray-400 text-lg">
              {currentDate}
            </div>
            <div className="text-gray-500 text-sm mt-2">
              Bergen, Norway (CET)
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.startsWith('✓') 
              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300' 
              : 'bg-red-500/20 border border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}

        {/* Selected Employee Card */}
        {selectedEmployee ? (
          <div className="flex-1 flex flex-col">
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-emerald-600/20 flex items-center justify-center border-2 border-emerald-500">
                  <User className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedEmployee.name}
                  </h3>
                  <p className={`text-sm font-medium mt-1 ${
                    selectedEmployee.onBreak ? 'text-yellow-400' :
                    selectedEmployee.active ? 'text-emerald-400' : 'text-gray-400'
                  }`}>
                    {selectedEmployee.onBreak ? '☕ On break' :
                     selectedEmployee.active ? '● Currently clocked in' : 'Not clocked in'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!selectedEmployee.active ? (
                  <button
                    onClick={handleClockIn}
                    disabled={loading}
                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/30"
                  >
                    <LogIn className="w-5 h-5" />
                    Clock In
                  </button>
                ) : selectedEmployee.onBreak ? (
                  <button
                    onClick={handleEndBreak}
                    disabled={loading}
                    className="w-full py-5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-yellow-600/30"
                  >
                    <Coffee className="w-5 h-5" />
                    End Break
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleStartBreak}
                      disabled={loading}
                      className="w-full py-5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/30"
                    >
                      <Coffee className="w-5 h-5" />
                      Start Break
                    </button>
                    <button
                      onClick={handleClockOut}
                      disabled={loading}
                      className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-red-600/30"
                    >
                      <LogOut className="w-5 h-5" />
                      Clock Out
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* (History section removed) */}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <User className="w-20 h-20 mx-auto mb-4 opacity-50" />
              <p className="text-xl">Select an employee from the list</p>
              <p className="text-sm mt-2">to clock in or out</p>
            </div>
          </div>
        )}

        {/* Configuration Notice */}
        <div className="mt-4 p-3 bg-emerald-600/10 border border-emerald-600/30 rounded-lg">
          <p className="text-emerald-300 text-xs text-center">
            <strong>Ready to use:</strong> This build uses hard-coded webhooks.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeKiosk;
