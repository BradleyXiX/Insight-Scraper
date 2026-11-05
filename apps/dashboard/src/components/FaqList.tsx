import React from "react";

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqListProps {
  items: FaqItem[];
}

export function FaqList({ items }: FaqListProps): React.ReactElement {
  return (
    <dl className="w-full divide-y divide-border border-y border-border">
      {items.map((item, index) => (
        <div key={index} className="py-6 sm:py-8">
          <dt className="text-lg sm:text-xl font-semibold text-white mb-2">
            {item.q}
          </dt>
          <dd className="text-sm sm:text-base text-foreground/70 leading-relaxed">
            {item.a}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default FaqList;

