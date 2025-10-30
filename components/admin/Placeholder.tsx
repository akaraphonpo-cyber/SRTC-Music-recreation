import React from 'react';

interface PlaceholderProps {
  title: string;
  icon?: React.ReactNode;
}

const Placeholder: React.FC<PlaceholderProps> = ({ title, icon }) => (
  <div className="glass-card p-6 rounded-2xl h-full flex flex-col items-center justify-center text-center">
    {icon && <div className="mb-4" style={{color: 'rgb(var(--accent-color))'}}>{icon}</div>}
    <h2 className="text-2xl font-bold text-shadow mb-2" style={{color: 'var(--text-primary)'}}>{title}</h2>
    <p className="mt-4 text-shadow" style={{color: 'var(--text-secondary)'}}>คุณสมบัตินี้อยู่ระหว่างการพัฒนา และจะพร้อมใช้งานเร็วๆ นี้</p>
    <p className="text-sm text-shadow" style={{color: 'var(--text-muted)'}}>(This feature is under development and will be available soon.)</p>
  </div>
);

export default Placeholder;