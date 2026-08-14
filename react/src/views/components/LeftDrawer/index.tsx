import MenuIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import { IconButton, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import { default as MuiDrawer } from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/styles';
import makeStyles from '@mui/styles/makeStyles';
import clsx from 'clsx';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { ROUTES } from '../../../constants';
import { useDrawerStore } from '../../../zus';

const drawerWidth = 190;
const drawerWidthClosed = 50;

const openCloseMixin = (theme) =>
  ({
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
  } as const);

const Drawer = styled(MuiDrawer)(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...openCloseMixin(theme),
  '& .MuiDrawer-paper': {
    background: '#f2f1e3f0',
    ...openCloseMixin(theme),
    width: open ? drawerWidth : drawerWidthClosed,
  },
}));

function LeftDrawer() {
  const classes = useStyles();
  const toggleDrawer = useDrawerStore((s) => s.toggleDrawer);
  const isOpen = useDrawerStore((s) => s.isDrawerOpen);
  const isCollapsed = !isOpen;
  const location = useLocation();
  const history = useHistory();

  useHotkeys(['shift+`', 'alt+`'], () => toggleDrawer());
  useHotkeys(['shift+1', 'alt+1'], () => history.push(ROUTES._1ChonFileExcel.path));
  useHotkeys(['shift+2', 'alt+2'], () => history.push(ROUTES._2XepLop.path));
  useHotkeys(['shift+3', 'alt+3'], () => history.push(ROUTES._3KetQua.path));

  return (
    <nav className={classes.drawer}>
      <Drawer className={clsx(classes.drawer)} variant="permanent" open={isOpen}>
        <Box className={classes.drawerTopCollapse}>
          <Tooltip title={isOpen ? 'Collapse' : 'Expand'}>
            <IconButton color="inherit" onClick={toggleDrawer} size="large">
              <MenuIcon className={clsx(classes.collapseIcon, isCollapsed && classes.collapseIconCollapsed)} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box className={clsx(classes.brand, isCollapsed && classes.brandCollapsed)}>
          <Typography className={classes.brandText}>{isCollapsed ? 'g' : 'guiguzi'}</Typography>
        </Box>

        {/* List item */}
        <List>
          {Object.values(ROUTES).map((route, index) => (
            <ListItem
              key={route.path}
              className={classes.listItem}
              button
              component={NavLink}
              to={route.path + location.search}
              activeClassName={classes.menuItemActive}
            >
              <ListItemText primary={isOpen ? route.name : `${index + 1}.`} />
            </ListItem>
          ))}
        </List>

      </Drawer>
    </nav>
  );
}

export default LeftDrawer;

// styles below:

const useStyles = makeStyles((theme) => ({
  drawer: {
    width: drawerWidth,
    transition: 'all 0.3s ease',
  },
  collapseIcon: {
    margin: '0 auto 0',
    transform: 'rotate(0deg)',
    transition: 'all 0.3s ease',
  },
  collapseIconCollapsed: {
    transform: 'rotate(540deg)',
  },
  brand: {
    height: 110,
    display: 'grid',
    placeItems: 'center',
    color: theme.palette.primary.main,
    transition: 'all 0.3s ease',
  },
  brandCollapsed: {
    height: 70,
  },
  brandText: {
    fontWeight: 700,
    fontSize: 24,
    letterSpacing: 1,
  },
  drawerTopCollapse: {
    background: '#f7dce733',
    color: theme.palette.primary.main,
    fontWeight: 'bolder',
    borderBottom: '1px solid #ccc',
    display: 'grid',
    placeItems: 'center',
  },
  listItem: {
    borderTop: '1px solid transparent',
    borderBottom: '1px solid transparent',
    userSelect: 'none',
    userDrag: 'none',
    marginTop: 10,
  },
  menuItemActive: {
    background: '#f7dce733',
    color: theme.palette.primary.main,
    fontWeight: 'bolder',
    borderTop: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
  },
}));
