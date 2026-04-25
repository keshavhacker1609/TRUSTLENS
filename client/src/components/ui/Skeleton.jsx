import React from 'react';

export function Skeleton({ width = '100%', height = 16, className = '', style = {} }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <table className="tl-table">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}>
              <Skeleton width={80} height={10} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r} style={{ cursor: 'default' }}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}>
                <Skeleton
                  width={c === 0 ? 90 : c === cols - 1 ? 60 : '80%'}
                  height={12}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Skeleton;
