export default function NotFound() {
    return (
        <html lang="en">
            <body>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', fontFamily: 'sans-serif' }}>
                    <h1>404 - Page Not Found</h1>
                    <p>Redirecting...</p>
                    <script dangerouslySetInnerHTML={{ __html: `window.location.href = "/zh"` }} />
                </div>
            </body>
        </html>
    );
}
