import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders POWER GYM heading', () => {
    render(<App />);
    expect(screen.getByText('POWER GYM')).toBeInTheDocument();
  });
});
