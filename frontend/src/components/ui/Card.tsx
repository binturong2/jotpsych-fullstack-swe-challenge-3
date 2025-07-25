import type { ReactNode } from 'react';

const Card = ({
  children,
  header,
}: {
  children: ReactNode;
  header?: JSX.Element;
}) => (
  <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm">
    {header && <div className="px-4 py-5 sm:px-6">{header}</div>}
    <div className="px-4 py-5 sm:p-6">{children}</div>
  </div>
);

export default Card;
