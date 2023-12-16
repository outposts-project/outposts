export type MenuRoot = MenuEntry[]

export type MenuItem = {
  name: string;
  icon?: string;
  routerLink?: string;
  href?: string;
  children?: undefined;
}

export type MenuGroup = {
  name: string;
  routerLink?: string;
  href?: string;
  icon: string;
  children: MenuEntry[];
}

export type MenuEntry = MenuItem | MenuGroup;
