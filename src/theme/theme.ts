import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    text: {
      primary: "#ffffff",
    },
    primary: {
      main: "rgb(255, 255, 255)",
      contrastText: "rgb(81 36 0)",
    },
    secondary: {
      main: "rgb(229 191 169)",
      contrastText: "rgb(67 43 28)",
    },
    error: {
      main: "rgb(255 180 171)",
      contrastText: "rgb(105 0 5)",
    },
  },
});
