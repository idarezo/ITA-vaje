import { render, screen } from '@testing-library/react';
import App from './App';

test('renders container shell heading', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: /container shell za microfrontend arhitekturo/i })
  ).toBeInTheDocument();
});
