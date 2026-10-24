import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Content, Header, HeaderContainer, HeaderGlobalBar, HeaderMenuButton, HeaderName, InlineNotification,
  Select, SelectItem, SideNav, SideNavItems, SideNavLink, SkipToContent, Theme, Tag
} from '@carbon/react';
import { DataConnected, Folder, Hourglass, Partnership, UserMultiple, UserProfile } from '@carbon/icons-react';
import { useSession } from './session.jsx';
import { Loading } from './components.jsx';
import Team from './pages/Team.jsx';
import StaffProject from './pages/StaffProject.jsx';
import Projects from './pages/Projects.jsx';
import MondayBoard from './pages/MondayBoard.jsx';
import MyProfile from './pages/MyProfile.jsx';
import OpenProjects from './pages/OpenProjects.jsx';

const LEAD_NAV = [['/', 'Team', UserMultiple], ['/staff', 'Staff a project', Partnership], ['/projects', 'Projects', Folder], ['/monday', 'Monday board', DataConnected]];
const ENG_NAV = [['/', 'My profile', UserProfile], ['/open', 'Open projects', Hourglass], ['/team', 'Team', UserMultiple], ['/projects', 'Projects', Folder]];

function usePrefersDark() {
  const q = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => window.matchMedia?.(q).matches ?? false);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = e => setDark(e.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return dark;
}

export default function App() {
  const { me, devUsers, switchUser, error } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dark = usePrefersDark();
  const lead = me?.isLead;
  const nav = lead ? LEAD_NAV : ENG_NAV;
  const isActive = path => (path === '/' ? pathname === '/' : pathname.startsWith(path));

  return (
    <Theme theme={dark ? 'g100' : 'g10'} className="app-theme">
      <HeaderContainer render={({ isSideNavExpanded, onClickSideNavExpand }) => (
        <Theme theme="g100">
          <Header aria-label="Work Delegation Dashboard">
            <SkipToContent />
            <HeaderMenuButton aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'} onClick={onClickSideNavExpand} isActive={isSideNavExpanded} aria-expanded={isSideNavExpanded} />
            <HeaderName href="/" prefix="Squad 3" onClick={e => { e.preventDefault(); navigate('/'); }}>Work Delegation</HeaderName>
            <HeaderGlobalBar>
              {me && <span className="header-who">{me.name}{lead && <Tag size="sm" type="cyan">Lead</Tag>}</span>}
            </HeaderGlobalBar>
            {me && (
              <SideNav aria-label="Side navigation" expanded={isSideNavExpanded} onSideNavBlur={onClickSideNavExpand} href="#main-content">
                <SideNavItems>
                  {nav.map(([path, label, Icon]) => (
                    <SideNavLink key={path} renderIcon={Icon} href={path} isActive={isActive(path)}
                      onClick={e => { e.preventDefault(); navigate(path); if (isSideNavExpanded) onClickSideNavExpand(); }}>
                      {label}
                    </SideNavLink>
                  ))}
                </SideNavItems>
              </SideNav>
            )}
          </Header>
        </Theme>
      )} />

      <Content id="main-content" className="app-content">
        {devUsers && (
          <div className="dev-bar">
            <Select id="view-as" size="sm" inline labelText="Viewing as (dev sign-in)" value={me?.email || ''}
              onChange={e => { switchUser(e.target.value); navigate('/'); }}>
              {devUsers.map(u => <SelectItem key={u.email} value={u.email} text={`${u.name}${u.isLead ? ' · lead' : ''}`} />)}
            </Select>
          </div>
        )}
        {error && <InlineNotification kind="error" lowContrast hideCloseButton title="Can't sign you in" subtitle={error} />}
        {!me && !error && <Loading />}
        {me && (
          <div className="page" key={me.id}>
            <Routes>
              {lead ? <>
                <Route path="/" element={<Team />} />
                <Route path="/staff" element={<StaffProject />} />
                <Route path="/staff/:id" element={<StaffProject />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/monday" element={<MondayBoard />} />
              </> : <>
                <Route path="/" element={<MyProfile />} />
                <Route path="/open" element={<OpenProjects />} />
                <Route path="/team" element={<Team />} />
                <Route path="/projects" element={<Projects />} />
              </>}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        )}
      </Content>
    </Theme>
  );
}
