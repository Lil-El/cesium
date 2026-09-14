import * as cesium from "cesium";
import { Ability } from "./ability.js";
import { AbilityContextMenu } from "./ability-context-menu.js";

export class AbilitySupervisor {
  #currentAbility = null;

  #abilities = [];

  #viewer = null;

  #abilityEntity = null;

  constructor(abilityEntity) {
    this.#abilityEntity = abilityEntity;
    this.#viewer = abilityEntity.viewer;
    this.#abilities = this.#inject(abilityEntity.rawAbilityMap[abilityEntity.mode]?.() || []);
  }

  get abilityEntity() {
    return this.#abilityEntity;
  }

  get abilities() {
    return this.#abilities;
  }

  showContextMenu(position) {
    AbilityContextMenu.build(this.#viewer, this.#abilities);
    AbilityContextMenu.showMenu(position);
  }

  hideContextMenu() {
    AbilityContextMenu.hideMenu();
  }

  destroy() {
    this.#release(this.#abilities);
    this.#abilities = [];
    this.#viewer = null;
    this.activeAbility = null;
  }

  setCurrentAbility(ability) {
    if (this.#currentAbility && this.#currentAbility !== ability) {
      this.#currentAbility.cancel();
    }

    this.#currentAbility = ability;
  }

  /**
   * 注入能力
   */
  #inject(abilities) {
    return abilities.map((item) => {
      if (item.prototype instanceof Ability) {
        return new item(this.#abilityEntity);
      } else {
        return { ...item, children: this.#inject(item.children) };
      }
    });
  }

  #release(abilities) {
    abilities.forEach((item) => {
      if (item instanceof Ability) {
        item.destroy();
      } else {
        this.#release(item.children);
      }
    });
  }
}
