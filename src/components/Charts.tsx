// src/components/Charts.tsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// Animation variants
const chartVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut'
    }
  }
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}
      >
        <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color, fontSize: '14px', fontWeight: '600' }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </motion.div>
    );
  }
  return null;
};

// Issue Activity Line Chart
interface IssueActivityChartProps {
  data?: Array<{ day: string; issues: number; completed: number }>;
}

export const IssueActivityChart: React.FC<IssueActivityChartProps> = ({ data }) => {
  // If no data provided, show empty state message
  const defaultData = data || [];

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px'
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
        Issue Activity (Last 7 Days)
      </h3>
      {defaultData.length === 0 ? (
        <div style={{
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '14px'
        }}>
          No activity data available yet
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={defaultData}>
          <defs>
            <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3498db" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3498db" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#2ecc71" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#94a3b8', fontSize: '14px' }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="issues"
            stroke="#3498db"
            strokeWidth={3}
            dot={{ fill: '#3498db', r: 5 }}
            activeDot={{ r: 7, fill: '#3498db' }}
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="#2ecc71"
            strokeWidth={3}
            dot={{ fill: '#2ecc71', r: 5 }}
            activeDot={{ r: 7, fill: '#2ecc71' }}
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </LineChart>
      </ResponsiveContainer>
      )}
    </motion.div>
  );
};

// Issue Status Distribution Pie Chart
interface IssueDistributionChartProps {
  data?: Array<{ name: string; value: number; color: string }>;
}

export const IssueDistributionChart: React.FC<IssueDistributionChartProps> = ({ data }) => {
  const defaultData = data || [
    { name: 'TODO', value: 30, color: '#94a3b8' },
    { name: 'IN PROGRESS', value: 45, color: '#f39c12' },
    { name: 'REVIEW', value: 15, color: '#3498db' },
    { name: 'DONE', value: 60, color: '#2ecc71' }
  ];

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px'
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
        Issue Status Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={defaultData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {defaultData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '16px',
        flexWrap: 'wrap'
      }}>
        {defaultData.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: entry.color
            }} />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Priority Distribution Chart
interface PriorityChartProps {
  data?: Array<{ priority: string; count: number }>;
}

export const PriorityChart: React.FC<PriorityChartProps> = ({ data }) => {
  const defaultData = data || [
    { priority: 'HIGHEST', count: 8 },
    { priority: 'HIGH', count: 15 },
    { priority: 'MEDIUM', count: 25 },
    { priority: 'LOW', count: 18 },
    { priority: 'LOWEST', count: 10 }
  ];

  const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#3498db', '#95a5a6'];

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px'
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
        Issue Priority Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={defaultData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="priority" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            radius={[8, 8, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {defaultData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// Team Performance Area Chart
interface TeamPerformanceChartProps {
  data?: Array<{ week: string; completed: number; assigned: number; velocity: number }>;
}

export const TeamPerformanceChart: React.FC<TeamPerformanceChartProps> = ({ data }) => {
  const defaultData = data || [
    { week: 'Week 1', completed: 20, assigned: 25, velocity: 18 },
    { week: 'Week 2', completed: 28, assigned: 30, velocity: 25 },
    { week: 'Week 3', completed: 35, assigned: 35, velocity: 32 },
    { week: 'Week 4', completed: 42, assigned: 40, velocity: 40 }
  ];

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px'
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
        Team Performance Trends
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={defaultData}>
          <defs>
            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#2ecc71" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3498db" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3498db" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9b59b6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#9b59b6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="week" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#94a3b8', fontSize: '14px' }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="assigned"
            stroke="#3498db"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAssigned)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#2ecc71"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCompleted)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="velocity"
            stroke="#9b59b6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorVelocity)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// User Activity Radar Chart
interface UserActivityChartProps {
  data?: Array<{ metric: string; value: number; fullMark: number }>;
}

export const UserActivityChart: React.FC<UserActivityChartProps> = ({ data }) => {
  const defaultData = data || [
    { metric: 'Issues Created', value: 85, fullMark: 100 },
    { metric: 'Comments', value: 70, fullMark: 100 },
    { metric: 'Code Reviews', value: 60, fullMark: 100 },
    { metric: 'Collaboration', value: 75, fullMark: 100 },
    { metric: 'Completion Rate', value: 90, fullMark: 100 }
  ];

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px'
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
        User Activity Metrics
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={defaultData}>
          <PolarGrid stroke="rgba(255,255,255,0.2)" />
          <PolarAngleAxis
            dataKey="metric"
            stroke="#94a3b8"
            style={{ fontSize: '11px' }}
          />
          <PolarRadiusAxis
            stroke="#94a3b8"
            style={{ fontSize: '10px' }}
          />
          <Radar
            name="Activity"
            dataKey="value"
            stroke="#3498db"
            fill="#3498db"
            fillOpacity={0.6}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// Burndown Chart
interface BurndownChartProps {
  data?: Array<{ day: string; ideal: number; actual: number }>;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({ data }) => {
  const defaultData = data || [
    { day: 'Day 1', ideal: 100, actual: 100 },
    { day: 'Day 2', ideal: 90, actual: 92 },
    { day: 'Day 3', ideal: 80, actual: 85 },
    { day: 'Day 4', ideal: 70, actual: 75 },
    { day: 'Day 5', ideal: 60, actual: 62 },
    { day: 'Day 6', ideal: 50, actual: 48 },
    { day: 'Day 7', ideal: 40, actual: 35 },
    { day: 'Day 8', ideal: 30, actual: 25 },
    { day: 'Day 9', ideal: 20, actual: 15 },
    { day: 'Day 10', ideal: 10, actual: 8 },
    { day: 'Day 11', ideal: 0, actual: 0 }
  ];

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px'
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
        Sprint Burndown Chart
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={defaultData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#94a3b8', fontSize: '14px' }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#94a3b8', r: 4 }}
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#e74c3c"
            strokeWidth={3}
            dot={{ fill: '#e74c3c', r: 5 }}
            activeDot={{ r: 7, fill: '#e74c3c' }}
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
