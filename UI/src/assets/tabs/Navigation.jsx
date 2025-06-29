import React from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box, IconButton, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import './Navigation.css';

const drawerWidth = 220;
const appBarHeight = 64;

const Navigation = ({ currentTab, onTabChange, onNavStateChange, appBarMode, navOpen }) => {
  if (appBarMode) {
    return (
      <IconButton
        onClick={() => onNavStateChange && onNavStateChange(!navOpen)}
        size="large"
        sx={{
          color: '#232526',
          background: '#fff',
          border: '1px solid #e3e4e8',
          boxShadow: '0 2px 8px #bfc2c733',
          mr: 2,
          '&:hover': { background: '#f5f6fa' },
        }}
        aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
      >
        {navOpen ? <MenuOpenIcon /> : <MenuIcon />}
      </IconButton>
    );
  }

  return (
    <>
      {navOpen && (
        <div
          className="navigation-overlay"
          style={{ top: appBarHeight, height: `calc(100vh - ${appBarHeight}px)` }}
          onClick={() => onNavStateChange && onNavStateChange(false)}
        />
      )}
      <Drawer
        variant="persistent"
        open={navOpen}
        sx={{
          width: drawerWidth,
          minWidth: drawerWidth,
          maxWidth: drawerWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          transition: 'width 0.3s',
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            minWidth: drawerWidth,
            maxWidth: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'transparent',
            borderRight: 'none',
            overflowX: 'hidden',
            transition: 'width 0.3s',
            top: appBarHeight,
            height: `calc(100vh - ${appBarHeight}px)`
          },
        }}
        className={`navigation-root${navOpen ? ' open' : ''}`}
        PaperProps={{ style: { top: appBarHeight, height: `calc(100vh - ${appBarHeight}px)` } }}
      >
        <Toolbar className="navigation-toolbar" style={{ minHeight: 48, justifyContent: 'flex-end' }}>
          <IconButton onClick={() => onNavStateChange && onNavStateChange(false)} size="small">
            <MenuOpenIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List className="navigation-list">
            <ListItem disablePadding className={`navigation-listitem${currentTab === 'dashboard' ? ' selected' : ''}`} sx={{ width: '90%' }}>
              <ListItemButton
                selected={currentTab === 'dashboard'}
                onClick={() => onTabChange('dashboard')}
                sx={{
                  minHeight: 44,
                  justifyContent: 'flex-start',
                  px: 2.5,
                  width: '100%',
                  borderRadius: 2,
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: 1.1, color: '#232526' }}>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText primary="Dashboard" sx={{ span: { fontWeight: 700, fontSize: '1.05rem', color: '#232526', letterSpacing: 0.5 } }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navigation;
