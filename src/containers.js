import Storage from './Storage/HostStorage';
import ContextualIdentity, {NO_CONTAINER} from './ContextualIdentity';
import Tabs from './Tabs';
import PreferenceStorage from './Storage/PreferenceStorage';
import {filterByKey} from './utils';
import {buildDefaultContainer} from './defaultContainer';

const IGNORED_URLS_REGEX = /^(about|moz-extension|file|javascript|data|chrome):/;

/**
 * Keep track of the tabs we're creating
 * tabId: url
 */
const creatingTabs = {};

const createTab = (url, newTabIndex, currentTabId, openerTabId, cookieStoreId) => {
  Tabs.get(currentTabId).then((currentTab) => {
    const createOptions = {
      url,
      index: newTabIndex,
      cookieStoreId,
      active: currentTab.active,
      pinned: currentTab.pinned,
      discarded: currentTab.discarded,
      openInReaderMode: currentTab.isInReaderMode,
    };
    // Passing the openerTabId without a cookieStoreId
    // creates a tab in the same container as the opener
    if (cookieStoreId && openerTabId) {
      createOptions.openerTabId = openerTabId;
    }
    Tabs.create(createOptions).then((createdTab) => {
      creatingTabs[createdTab.id] = url;
      if (!cookieStoreId && openerTabId) {
        Tabs.update(createdTab.id, {
          openerTabId: openerTabId,
        });
      }
    });
    PreferenceStorage.get('keepOldTabs').then(({value}) => {
      // if keepOldTabs is false, remove the 'old' tab
      // -or-
      // if the current tab is about:blank or about:newtab
      // or some custom moz-extension pages
      // we should still close the current tab even though
      // keepOldTabs is true, because these are just
      // interstitial tabs that are no longer used
      if (!value || /^(about:)|(moz-extension:)/.test(currentTab.url)) {
        Tabs.remove(currentTabId);
      }
    }).catch(() => {
      Tabs.remove(currentTabId);
    });

  });

  return {
    cancel: true,
  };
};


async function handle(url, tabId) {
  const creatingUrl = creatingTabs[tabId];
  if (IGNORED_URLS_REGEX.test(url) || creatingUrl === url) {
    return;
  } else if (creatingUrl) {
    delete creatingTabs[tabId];
  }
  let preferences = await PreferenceStorage.getAll(true);
  let [hostMap, identities, currentTab] = await Promise.all([
    Storage.get(url, preferences.matchDomainOnly),
    ContextualIdentity.getAll(),
    Tabs.get(tabId),
  ]);

  if (currentTab.incognito || !hostMap) {
    return {};
  }

  const openNavigationMatchInCurrentContainerRaw = preferences.openNavigationMatchInCurrentContainer;
//  console.debug('Raw configuration variable: ' + openNavigationMatchInCurrentContainerRaw);
  if (typeof openNavigationMatchInCurrentContainerRaw !== 'undefined' && openNavigationMatchInCurrentContainerRaw !== '') {
    const openNavigationMatchInCurrentContainer = '(' + openNavigationMatchInCurrentContainerRaw + ')';
//    console.debug(`openNavigationMatchInCurrentContainer: ${openNavigationMatchInCurrentContainer}`);
    let re = new RegExp(openNavigationMatchInCurrentContainer);
//    console.debug(`currentTab.cookieStoreId =${currentTab.cookieStoreId}`);
    if (currentTab.cookieStoreId !== 'firefox-default' && re.test(url)) {
      console.debug(`Regex "${openNavigationMatchInCurrentContainer}" matched. Opening URL ${url} in current container`);
      return {};
    }
  }

  const matchForStickyContainersRaw = preferences.matchForStickyContainers;
  if (typeof matchForStickyContainersRaw !== 'undefined' && matchForStickyContainersRaw !== '') {
    let re = new RegExp(`(${matchForStickyContainersRaw})`);
//    let identity = browser.contextualIdentities.get(currentTab.cookieStoreId);

    const identity = identities.find((identity) => identity.cookieStoreId === currentTab.cookieStoreId);

    if (identity && re.test(identity.name)) {
      console.debug(`Regex "${matchForStickyContainersRaw}" matched with current container \`${identity.name}\`. Opening URL \`${url}\` in current container`);
      return {};
    } else {
      console.debug(`Regex "${matchForStickyContainersRaw}" did not match with current container \`${identity.name}\`. Not opening URL \`${url}\` in current container`);
    }
  }

  const hostIdentity = identities.find((identity) => identity.cookieStoreId === hostMap.cookieStoreId);
  let targetCookieStoreId;

  if (!hostIdentity) {
    if (preferences.defaultContainer) {
      const defaultContainer = await buildDefaultContainer(
          filterByKey(preferences, prefKey => prefKey.startsWith('defaultContainer')),
          url
      );
      targetCookieStoreId = defaultContainer.cookieStoreId;
      // console.debug('Going to open', url, 'in default container', targetCookieStoreId, defaultContainer.name);
    } else {
      return {};
    }
  } else {
    targetCookieStoreId = hostIdentity.cookieStoreId;
  }

  const targetIsNoContainer = targetCookieStoreId === NO_CONTAINER.cookieStoreId;
  const tabHasContainer = currentTab.cookieStoreId !== NO_CONTAINER.cookieStoreId;
  const tabInDifferentContainer = currentTab.cookieStoreId !== targetCookieStoreId;
  const openInNoContainer = targetIsNoContainer && tabHasContainer;
  if ((tabInDifferentContainer && !openInNoContainer) || openInNoContainer) {
    return createTab(
        url,
        currentTab.index + 1, currentTab.id,
        currentTab.openerTabId,
        targetCookieStoreId);
  }

  return {};

}

export const webRequestListener = (requestDetails) => {

  if (requestDetails.frameId !== 0 || requestDetails.tabId === -1) {
    return {};
  }
  return handle(requestDetails.url, requestDetails.tabId);
};

export const tabUpdatedListener = (tabId, changeInfo) => {
  if (!changeInfo.url) {
    return;
  }
  return handle(changeInfo.url, tabId);
};
