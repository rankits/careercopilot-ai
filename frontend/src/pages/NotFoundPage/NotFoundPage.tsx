import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="center-page">
      <h1>404</h1>
      <p className="muted">The requested page does not exist.</p>
      <Link to="/">Return home</Link>
    </div>
  );
}
