import React from 'react';

export function HomepageHeadings() {
  return (
    <div id="intro" className="mt-[18vh] mx-auto text-center px-4 lg:px-0">
      <h1 className="text-4xl lg:text-6xl text-primary tracking-wide mb-8 animate-fade-in">
        Build internal apps using AI
      </h1>
      <p className="text-md lg:text-xl font-light text-primary mb-8 animate-fade-in animation-delay-200">
        Securely connect your database, write a prompt and deploy in seconds.
      </p>
    </div>
  );
}
