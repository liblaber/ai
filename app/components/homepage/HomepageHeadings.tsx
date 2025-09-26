import React from 'react';

export function HomepageHeadings() {
  return (
    <div id="intro" className="mx-auto xl:mt-[12vh] lg:mt-[8vh] text-center px-4 lg:px-0">
      <h1 className="text-4xl lg:text-5xl font-normal text-primary tracking-wide mb-8 animate-fade-in">
        Start building with{' '}
        <span className="font-extrabold">
          liblab
          <span className="text-accent">
            <span className="font-semibold">&#123;</span>ai<span className="font-semibold">&#125;</span>
          </span>
        </span>
      </h1>
      <p className="text-md lg:text-md font-light text-primary mb-8 animate-fade-in animation-delay-200">
        Secure your data source connection, craft a prompt, and go live within seconds.
      </p>
    </div>
  );
}
