import React, { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, User, CheckCircle, Coffee } from 'lucide-react';

const MIN_PIN_LEN = 4;
const MAX_PIN_LEN = 6;

const EmployeeKiosk = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // HARDCODED n8n WEBHOOKS
  const [config] = useState({
    n8nGetEmployeesUrl: 'https://primary-production-191cf.up.railway.app/webhook/get-employees',
    n8nClockInUrl: 'https://primary-production-191cf.up.railway.app/webhook/clock-in',
    n8nClockOutUrl: 'https://primary-production-191cf.up.railway.app/webhook/clock-out',
    n8nStartBreakUrl: 'https://primary-production-191cf.up.railway.app/webhook/start-break',
    n8nEndBreakUrl: 'https://primary-production-191cf.up.railway.app/webhook/end-break'
  });

  // Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const options = { timeZone: 'Europe/Oslo', hour12: false };
      setCurrentTime(now.toLocaleTimeString('en-NO', { ...options, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-NO', { ...options, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Load employees
  useEffect(() => { fetchEmployees(); }, []);
  const fetchEmployees = async () => {
    try {
      const response = await fetch(config.n8nGetEmployeesUrl);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      } else {
        console.error('Failed to fetch employees');
      }
    } catch (e) {
      console.error('Error fetching employees:', e);
    }
  };

  const post = (url, body) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  // ----- PIN logic -----
  const submitPin = useCallback(() => {
    const pin = pinInput.trim();
    if (pin.length < MIN_PIN_LEN) return;

    // Find employee by PIN (supports 'PIN' or 'pin' fields; compares as string)
    const found = employees.find(e => String(e.PIN ?? e.pin ?? '') === pin);
    if (!found) {
      setMessage('✗ Wrong PIN');
      setTimeout(() => setMessage(''), 2000);
      setPinInput('');
      return;
    }

    setSelectedEmployee(found);
    setPinInput('');
    setMessage(`Welcome ${found.name}!`);
    setTimeout(() => setMessage(''), 1500);
  }, [pinInput, employees]);

  const appendDigit = (d) => setPinInput(p => (p + d).slice(0, MAX_PIN_LEN));
  const backspace = () => setPinInput(p => p.slice(0, -1));
  const clearPin = () => setPinInput('');

  // Hardware keyboard support
  useEffect(() => {
    const onKey = (e) => {
      if (selectedEmployee) return; // only on PIN screen
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitPin();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearPin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedEmployee, submitPin]);

  // Auto-submit if user reaches MIN length and taps Enter button
  const handleEnter = () => submitPin();

  // ----- Actions -----
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
        setMessage('✓ Clocked in!');
      } else setMessage('✗ Clock in failed');
    } catch (e) {
      setMessage('✗ Error');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 2500);
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
      if (response.ok) setMessage('✓ Clocked out!');
      else setMessage('✗ Clock out failed');
    } catch (e) {
      setMessage('✗ Error');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 2500);
  };

  const handleStartBreak = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await post(config.n8nStartBreakUrl, {
        timesheetId: selectedEmployee.currentTimesheetId,
        breakStart: new Date().toISOString()
      });
      if (res.ok) setMessage('✓ Break started!');
      else setMessage('✗ Failed to start break');
    } catch (e) {
      setMessage('✗ Error');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 2500);
  };

  const handleEndBreak = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await post(config.n8nEndBreakUrl, {
        timesheetId: selectedEmployee.currentTimesheetId,
        breakEnd: new Date().toISOString()
      });
      if (res.ok) setMessage('✓ Break ended!');
      else setMessage('✗ Failed to end break');
    } catch (e) {
      setMessage('✗ Error');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 2500);
  };

  // ----- UI -----
  const PinDots = ({ value }) => {
    const len = value.length;
    const placeholders = Math.max(MIN_PIN_LEN, MAX_PIN_LEN);
    return (
      <div className="flex justify-center gap-3 mb-5">
        {Array.from({ length: placeholders }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border border-gray-600 ${i < len ? 'bg-white' : 'bg-transparent'}`}
          />
        ))}
      </div>
    );
  };

  const KeyButton = ({ children, onClick, wide = false, ariaLabel }) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition
        ${wide ? 'col-span-2' : ''}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800/70 border border-gray-700 rounded-2xl p-6">
        <div className="text-center mb-6">
          <Clock className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white mb-2">Time Kiosk</h1>
          <div className="text-gray-400">{currentDate}</div>
          <div className="text-4xl text-white font-mono mt-1">{currentTime}</div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            message.startsWith('✓') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
          }`}>
            {message}
          </div>
        )}

        {!selectedEmployee ? (
          <div>
            <h3 className="text-gray-300 text-center mb-3">Enter your PIN</h3>
            <PinDots value={pinInput} />

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <KeyButton key={n} onClick={() => appendDigit(String(n))} ariaLabel={`Digit ${n}`}>
                  {n}
                </KeyButton>
              ))}
              <KeyButton onClick={clearPin} ariaLabel="Clear">CLR</KeyButton>
              <KeyButton onClick={() => appendDigit('0')} ariaLabel="Digit 0">0</KeyButton>
              <KeyButton onClick={backspace} ariaLabel="Backspace">⌫</KeyButton>
              <KeyButton wide onClick={handleEnter} ariaLabel="Enter / Submit">
                Enter
              </KeyButton>
            </div>

            {/* Helper text */}
            <p className="text-center text-gray-500 text-xs mt-3">
              Tip: You can also use the keyboard (0–9, Enter, Backspace).
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-600/20 border border-emerald-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white text-xl font-bold">{selectedEmployee.name}</h3>
                <p className="text-gray-400 text-sm">Ready for action</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleClockIn}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg disabled:opacity-50"
              >
                <LogIn className="inline w-5 h-5 mr-2" /> Clock In
              </button>
              <button
                onClick={handleStartBreak}
                disabled={loading}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-lg disabled:opacity-50"
              >
                <Coffee className="inline w-5 h-5 mr-2" /> Start Break
              </button>
              <button
                onClick={handleEndBreak}
                disabled={loading}
                className="w-full py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-bold text-lg disabled:opacity-50"
              >
                <Coffee className="inline w-5 h-5 mr-2" /> End Break
              </button>
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg disabled:opacity-50"
              >
                <LogOut className="inline w-5 h-5 mr-2" /> Clock Out
              </button>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium"
              >
                Log Out / Back
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 p-3 bg-emerald-600/10 border border-emerald-600/30 rounded-lg">
          <p className="text-emerald-300 text-xs text-center">
            <strong>Ready to use:</strong> PIN keypad enabled.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeKiosk;
