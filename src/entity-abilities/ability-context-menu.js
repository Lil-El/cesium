import * as Cesium from "cesium";

import { AbilityEntity } from "../ability-entity.js";

export class AbilityContextMenu {
  /** @type {Cesium.Viewer} */
  static #viewer = null;

  /** @type {AbilityEntity} */
  static #drawnEntity = null;

  /** @type {HTMLElement} */
  static #menuElement = null;

  /**
   * @param {Cesium.Viewer} viewer
   * @param {Cesium.Entity} drawnEntity
   */
  static build(viewer, drawnEntity) {
    if (AbilityContextMenu.#drawnEntity === drawnEntity) return;

    AbilityContextMenu.#drawnEntity = drawnEntity;
    AbilityContextMenu.#viewer = viewer;

    const container = viewer.container;

    const menu = document.createElement("div");
    menu.className = "ability-context-menu";
    menu.style.cssText = `
      display: none;
      position: absolute;
      z-index: 1000;
      background: rgba(38, 38, 38, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 4px 0;
      min-width: 120px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      font-size: 13px;
      color: #ccc;
      user-select: none;
    `;

    AbilityContextMenu.#renderMenuItems(menu, drawnEntity.properties.getValue().abilities);

    AbilityContextMenu.#menuElement = menu;
    container.appendChild(menu);

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) {
        AbilityContextMenu.hideMenu();
      }
    });
  }

  /**
   * @param {HTMLElement} parent
   * @param {object[]} items
   */
  static #renderMenuItems(parent, items) {
    for (const item of items) {
      const menuItem = document.createElement("div");
      menuItem.className = "ability-menu-item";
      menuItem.style.cssText = `
        position: relative;
        padding: 6px 24px 6px 12px;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s;
      `;

      menuItem.textContent = item.label;

      menuItem.addEventListener("mouseenter", () => {
        menuItem.style.background = "rgba(79, 195, 247, 0.25)";
      });
      menuItem.addEventListener("mouseleave", () => {
        menuItem.style.background = "";
      });

      if (item.children && item.children.length > 0) {
        const arrow = document.createElement("span");
        arrow.textContent = "▶";
        arrow.style.cssText = `
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 10px;
          color: #888;
        `;
        menuItem.appendChild(arrow);

        const submenu = AbilityContextMenu.#createSubmenu(item.children);
        menuItem.appendChild(submenu);

        menuItem.addEventListener("mouseenter", () => {
          submenu.style.display = "block";
        });
        menuItem.addEventListener("mouseleave", () => {
          submenu.style.display = "none";
        });
      } else if (item.ability) {
        menuItem.addEventListener("click", (e) => {
          e.stopPropagation();
          item.ability(AbilityContextMenu.#drawnEntity);
          AbilityContextMenu.hideMenu();
        });
      }

      parent.appendChild(menuItem);
    }
  }

  /**
   * @param {object[]} children
   * @returns {HTMLElement}
   */
  static #createSubmenu(children) {
    const submenu = document.createElement("div");
    submenu.className = "ability-submenu";
    submenu.style.cssText = `
      display: none;
      position: absolute;
      left: 100%;
      top: -4px;
      z-index: 1001;
      background: rgba(38, 38, 38, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 4px 0;
      min-width: 120px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      font-size: 13px;
      color: #ccc;
      user-select: none;
    `;

    for (const child of children) {
      const subItem = document.createElement("div");
      subItem.className = "ability-submenu-item";
      subItem.style.cssText = `
        padding: 6px 24px 6px 12px;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s;
      `;
      subItem.textContent = child.label;

      subItem.addEventListener("mouseenter", () => {
        subItem.style.background = "rgba(79, 195, 247, 0.25)";
      });
      subItem.addEventListener("mouseleave", () => {
        subItem.style.background = "";
      });

      if (child.ability) {
        subItem.addEventListener("click", (e) => {
          e.stopPropagation();
          child.ability(AbilityContextMenu.#drawnEntity);
          AbilityContextMenu.hideMenu();
        });
      }

      submenu.appendChild(subItem);
    }

    return submenu;
  }

  /**
   * @param {Cesium.Cartesian2} position
   */
  static showMenu(position) {
    if (!AbilityContextMenu.#menuElement) return;
    AbilityContextMenu.#menuElement.style.left = position.x + "px";
    AbilityContextMenu.#menuElement.style.top = position.y + "px";
    AbilityContextMenu.#menuElement.style.display = "block";

    AbilityContextMenu.#viewer.camera.changed.addEventListener(AbilityContextMenu.hideMenu);
  }

  static hideMenu() {
    if (AbilityContextMenu.#menuElement) {
      AbilityContextMenu.#menuElement.style.display = "none";
    }

    if (AbilityContextMenu.#viewer) {
      AbilityContextMenu.#viewer.camera.changed.removeEventListener(AbilityContextMenu.hideMenu);
    }
  }
}
