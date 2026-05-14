import React from 'react';
import { render, screen } from '@testing-library/react';
import { HubPagination } from '@/components/shared/hub-pagination';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('HubPagination', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <HubPagination currentPage={1} totalPages={1} basePath="/owner/trainers/abc/members" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders pagination when totalPages > 1', () => {
    render(
      <HubPagination currentPage={2} totalPages={4} basePath="/owner/trainers/abc/members" />
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders correct href for each page', () => {
    const { container } = render(
      <HubPagination currentPage={1} totalPages={3} basePath="/owner/trainers/abc/members" />
    );
    const anchors = container.querySelectorAll('a[href]');
    const hrefs = Array.from(anchors).map(a => a.getAttribute('href')).filter(Boolean);
    expect(hrefs).toContain('/owner/trainers/abc/members?page=1');
    expect(hrefs).toContain('/owner/trainers/abc/members?page=2');
    expect(hrefs).toContain('/owner/trainers/abc/members?page=3');
  });
});
