import { render, screen } from '@testing-library/react';
import App from './App';

test('renders auth microfrontend title', () => {
  render(<App shellContext={{ baseUrl: 'http://localhost:8080' }} />);
  expect(screen.getByRole('heading', { name: /auth microfrontend/i })).toBeInTheDocument();
});
