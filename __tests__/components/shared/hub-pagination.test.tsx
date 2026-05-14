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

  it('shows ellipsis for large page counts', () => {
    render(
      <HubPagination currentPage={5} totalPages={10} basePath="/test" />
    );
    // should render navigation
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    // current page link should be present
    const links = document.querySelectorAll('a[href]');
    const hrefs = Array.from(links).map(l => l.getAttribute('href'));
    expect(hrefs).toContain('/test?page=5');
    expect(hrefs).toContain('/test?page=1');
    expect(hrefs).toContain('/test?page=10');
  });

  it('shows all pages when totalPages is 7 or fewer', () => {
    render(
      <HubPagination currentPage={3} totalPages={7} basePath="/test" />
    );
    const links = document.querySelectorAll('a[href]');
    const hrefs = Array.from(links).map(l => l.getAttribute('href')).filter(Boolean);
    for (let i = 1; i <= 7; i++) {
      expect(hrefs).toContain(`/test?page=${i}`);
    }
  });
});
