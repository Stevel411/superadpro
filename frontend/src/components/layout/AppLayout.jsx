import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ title, subtitle, topbarActions, children, bgStyle }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-56 flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle}>
          {topbarActions}
        </Topbar>
        <main className="flex-1 p-6 overflow-y-auto" style={Object.assign({background:'#f0f3f9'}, bgStyle || {})}>
          {children}
        </main>
      </div>
    </div>
  );
}
