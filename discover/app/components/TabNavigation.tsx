"use client";

import React from "react";
import Link from "next/link";

interface TabNavigationProps {
  activeTab: string;
}

export default function TabNavigation({ activeTab }: TabNavigationProps) {
  const tabs = [
    { id: "discover", label: "Discover", href: "/" },
    { id: "creators", label: "Channels", href: "/creators" },
    { id: "thumbnail-preview", label: "Thumbnail Preview", href: "/thumbnail-preview" },
  ];

  return (
    <nav className="w-full mt-4 mb-6 border-b border-border-subtle" aria-label="Main Navigation">
      <ul className="flex list-none gap-4 sm:gap-7 p-0 m-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <li key={tab.id} className="relative flex flex-col items-center">
              <Link
                id={`tab-btn-${tab.id}`}
                href={tab.href}
                className={`bg-transparent border-none text-[1.2rem] sm:text-2xl pt-1.5 px-0.5 pb-2.5 sm:pt-2 sm:px-1 sm:pb-[14px] tracking-[-0.02em] transition-all duration-150 ease-in-out hover:text-brand hover:-translate-y-[1px] no-underline ${
                  isActive ? "text-brand font-bold" : "text-secondary font-medium"
                }`}
                aria-selected={isActive}
                role="tab"
              >
                {tab.label}
              </Link>
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand rounded-t-[3px] animate-slide-in" layout-id="underline" />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


