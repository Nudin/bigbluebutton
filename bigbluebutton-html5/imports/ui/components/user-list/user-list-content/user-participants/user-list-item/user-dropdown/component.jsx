import React, { PureComponent } from 'react';
import { defineMessages } from 'react-intl';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import UserAvatar from '/imports/ui/components/user-avatar/component';
import Icon from '/imports/ui/components/icon/component';
import Dropdown from '/imports/ui/components/dropdown/component';
import lockContextContainer from '/imports/ui/components/lock-viewers/context/container';
import { withModalMounter } from '/imports/ui/components/modal/service';
import RemoveUserModal from '/imports/ui/components/modal/remove-user/component';
import _ from 'lodash';
import { Session } from 'meteor/session';
import { styles } from './styles';
import UserName from '../user-name/component';
import Service from '/imports/ui/components/user-list/service';
import { PANELS, ACTIONS } from '../../../../../layout/enums';
import WhiteboardService from '/imports/ui/components/whiteboard/service';

const messages = defineMessages({
  presenter: {
    id: 'app.userList.presenter',
    description: 'Text for identifying presenter user',
  },
  you: {
    id: 'app.userList.you',
    description: 'Text for identifying your user',
  },
  locked: {
    id: 'app.userList.locked',
    description: 'Text for identifying locked user',
  },
  menuTitleContext: {
    id: 'app.userList.menuTitleContext',
    description: 'adds context to userListItem menu title',
  },
  userAriaLabel: {
    id: 'app.userList.userAriaLabel',
    description: 'aria label for each user in the userlist',
  },
  statusTriggerLabel: {
    id: 'app.actionsBar.emojiMenu.statusTriggerLabel',
    description: 'label for option to show emoji menu',
  },
  backTriggerLabel: {
    id: 'app.audio.backLabel',
    description: 'label for option to hide emoji menu',
  },
  StartPrivateChat: {
    id: 'app.userList.menu.chat.label',
    description: 'label for option to start a new private chat',
  },
  ClearStatusLabel: {
    id: 'app.userList.menu.clearStatus.label',
    description: 'Clear the emoji status of this user',
  },
  takePresenterLabel: {
    id: 'app.actionsBar.actionsDropdown.takePresenter',
    description: 'Set this user to be the presenter in this meeting',
  },
  makePresenterLabel: {
    id: 'app.userList.menu.makePresenter.label',
    description: 'label to make another user presenter',
  },
  giveWhiteboardAccess: {
    id: 'app.userList.menu.giveWhiteboardAccess.label',
    description: 'label to give user whiteboard access',
  },
  removeWhiteboardAccess: {
    id: 'app.userList.menu.removeWhiteboardAccess.label',
    description: 'label to remove user whiteboard access',
  },
  RemoveUserLabel: {
    id: 'app.userList.menu.removeUser.label',
    description: 'Forcefully remove this user from the meeting',
  },
  MuteUserAudioLabel: {
    id: 'app.userList.menu.muteUserAudio.label',
    description: 'Forcefully mute this user',
  },
  UnmuteUserAudioLabel: {
    id: 'app.userList.menu.unmuteUserAudio.label',
    description: 'Forcefully unmute this user',
  },
  PromoteUserLabel: {
    id: 'app.userList.menu.promoteUser.label',
    description: 'Forcefully promote this viewer to a moderator',
  },
  DemoteUserLabel: {
    id: 'app.userList.menu.demoteUser.label',
    description: 'Forcefully demote this moderator to a viewer',
  },
  UnlockUserLabel: {
    id: 'app.userList.menu.unlockUser.label',
    description: 'Unlock individual user',
  },
  LockUserLabel: {
    id: 'app.userList.menu.lockUser.label',
    description: 'Lock a unlocked user',
  },
  DirectoryLookupLabel: {
    id: 'app.userList.menu.directoryLookup.label',
    description: 'Directory lookup',
  },
  yesLabel: {
    id: 'app.endMeeting.yesLabel',
    description: 'confirm button label',
  },
  noLabel: {
    id: 'app.endMeeting.noLabel',
    description: 'cancel confirm button label',
  },
  removeConfirmTitle: {
    id: 'app.userList.menu.removeConfirmation.label',
    description: 'title for remove user confirmation modal',
  },
  removeConfirmDesc: {
    id: 'app.userlist.menu.removeConfirmation.desc',
    description: 'description for remove user confirmation',
  },
});

const propTypes = {
  compact: PropTypes.bool.isRequired,
  user: PropTypes.shape({}).isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  normalizeEmojiName: PropTypes.func.isRequired,
  isThisMeetingLocked: PropTypes.bool.isRequired,
  getScrollContainerRef: PropTypes.func.isRequired,
  toggleUserLock: PropTypes.func.isRequired,
};
const CHAT_ENABLED = Meteor.settings.public.chat.enabled;
const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

class UserDropdown extends PureComponent {
  /**
   * Return true if the content fit on the screen, false otherwise.
   *
   * @param {number} contentOffSetTop
   * @param {number} contentOffsetHeight
   * @return True if the content fit on the screen, false otherwise.
   */
  static checkIfDropdownIsVisible(contentOffSetTop, contentOffsetHeight) {
    return (contentOffSetTop + contentOffsetHeight) < window.innerHeight;
  }

  constructor(props) {
    super(props);

    this.state = {
      isActionsOpen: false,
      dropdownOffset: 0,
      dropdownDirection: 'top',
      dropdownVisible: false,
      showNestedOptions: false,
    };

    this.handleScroll = this.handleScroll.bind(this);
    this.onActionsShow = this.onActionsShow.bind(this);
    this.onActionsHide = this.onActionsHide.bind(this);
    this.getDropdownMenuParent = this.getDropdownMenuParent.bind(this);
    this.renderUserAvatar = this.renderUserAvatar.bind(this);
    this.resetMenuState = this.resetMenuState.bind(this);
    this.makeDropdownItem = this.makeDropdownItem.bind(this);

    this.title = _.uniqueId('dropdown-title-');
    this.seperator = _.uniqueId('action-separator-');
  }

  componentDidUpdate() {
    this.checkDropdownDirection();
  }

  onActionsShow() {
    Session.set('dropdownOpen', true);
    const { getScrollContainerRef } = this.props;
    const dropdown = this.getDropdownMenuParent();
    const scrollContainer = getScrollContainerRef();

    if (dropdown && scrollContainer) {
      const dropdownTrigger = dropdown.children[0];
      const list = findDOMNode(this.list);
      const children = [].slice.call(list.children);
      children.find(child => child.getAttribute('role') === 'menuitem').focus();

      this.setState({
        isActionsOpen: true,
        dropdownVisible: false,
        dropdownOffset: dropdownTrigger.offsetTop - scrollContainer.scrollTop,
        dropdownDirection: 'top',
      });

      scrollContainer.addEventListener('scroll', this.handleScroll, false);
    }
  }

  onActionsHide(callback) {
    const { getScrollContainerRef } = this.props;

    this.setState({
      isActionsOpen: false,
      dropdownVisible: false,
      showNestedOptions: false,
    });

    const scrollContainer = getScrollContainerRef();
    scrollContainer.removeEventListener('scroll', this.handleScroll, false);

    if (callback) {
      return callback;
    }

    return Session.set('dropdownOpen', false);
  }

  getUsersActions() {
    const {
      intl,
      currentUser,
      user,
      voiceUser,
      getAvailableActions,
      getGroupChatPrivate,
      getEmojiList,
      setEmojiStatus,
      assignPresenter,
      removeUser,
      toggleVoice,
      changeRole,
      lockSettingsProps,
      hasPrivateChatBetweenUsers,
      toggleUserLock,
      requestUserInformation,
      isMeteorConnected,
      userLocks,
      isMe,
      meetingIsBreakout,
      mountModal,
      usersProp,
      newLayoutContextDispatch,
    } = this.props;
    const { showNestedOptions } = this.state;

    const amIPresenter = currentUser.presenter;
    const amIModerator = currentUser.role === ROLE_MODERATOR;
    const actionPermissions = getAvailableActions(amIModerator, meetingIsBreakout, user, voiceUser, usersProp, amIPresenter);
    const actions = [];

    const {
      allowedToChatPrivately,
      allowedToMuteAudio,
      allowedToUnmuteAudio,
      allowedToResetStatus,
      allowedToRemove,
      allowedToSetPresenter,
      allowedToPromote,
      allowedToDemote,
      allowedToChangeStatus,
      allowedToChangeUserLockStatus,
      allowedToChangeWhiteboardAccess,
    } = actionPermissions;

    const { disablePrivateChat } = lockSettingsProps;

    const enablePrivateChat = currentUser.role === ROLE_MODERATOR
      ? allowedToChatPrivately
      : allowedToChatPrivately
      && (!(currentUser.locked && disablePrivateChat)
        || hasPrivateChatBetweenUsers(currentUser.userId, user.userId)
        || user.role === ROLE_MODERATOR) && isMeteorConnected;

    const { allowUserLookup } = Meteor.settings.public.app;

    if (showNestedOptions && isMeteorConnected) {
      if (allowedToChangeStatus) {
        actions.push(this.makeDropdownItem(
          'back',
          intl.formatMessage(messages.backTriggerLabel),
          () => this.setState(
            {
              showNestedOptions: false,
              isActionsOpen: true,
            }, Session.set('dropdownOpen', true),
          ),
          'left_arrow',
        ));
      }

      actions.push(<Dropdown.DropdownListSeparator key={_.uniqueId('list-separator-')} />);

      const statuses = Object.keys(getEmojiList);
      statuses.map(status => actions.push(this.makeDropdownItem(
        status,
        intl.formatMessage({ id: `app.actionsBar.emojiMenu.${status}Label` }),
        () => { setEmojiStatus(user.userId, status); this.resetMenuState(); },
        getEmojiList[status],
      )));

      return actions;
    }

    if (allowedToChangeStatus && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'setstatus',
        intl.formatMessage(messages.statusTriggerLabel),
        () => this.setState(
          {
            showNestedOptions: true,
            isActionsOpen: true,
          }, () => {
            Session.set('dropdownOpen', true);
            Service.focusFirstDropDownItem();
          },
        ),
        'user',
        'right_arrow',
      ));
    }

    const showChatOption = CHAT_ENABLED
      && enablePrivateChat
      && user.clientType !== 'dial-in-user'
      && !meetingIsBreakout
      && isMeteorConnected;

    if (showChatOption) {
      actions.push(this.makeDropdownItem(
        'activeChat',
        intl.formatMessage(messages.StartPrivateChat),
        () => {
          getGroupChatPrivate(currentUser.userId, user);
          newLayoutContextDispatch({
            type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
            value: true,
          });
          newLayoutContextDispatch({
            type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
            value: PANELS.CHAT,
          });
          newLayoutContextDispatch({
            type: ACTIONS.SET_ID_CHAT_OPEN,
            value: user.userId,
          });
        },
        'chat',
      ));
    }

    if (allowedToResetStatus && user.emoji !== 'none' && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'clearStatus',
        intl.formatMessage(messages.ClearStatusLabel),
        () => this.onActionsHide(setEmojiStatus(user.userId, 'none')),
        'clear_status',
      ));
    }

    if (allowedToMuteAudio && isMeteorConnected && !meetingIsBreakout) {
      actions.push(this.makeDropdownItem(
        'mute',
        intl.formatMessage(messages.MuteUserAudioLabel),
        () => this.onActionsHide(toggleVoice(user.userId)),
        'mute',
      ));
    }

    if (allowedToUnmuteAudio && !userLocks.userMic && isMeteorConnected && !meetingIsBreakout) {
      actions.push(this.makeDropdownItem(
        'unmute',
        intl.formatMessage(messages.UnmuteUserAudioLabel),
        () => this.onActionsHide(toggleVoice(user.userId)),
        'unmute',
      ));
    }

    if (allowedToChangeWhiteboardAccess && !user.presenter && isMeteorConnected) {
      const label = user.whiteboardAccess ? intl.formatMessage(messages.removeWhiteboardAccess) : intl.formatMessage(messages.giveWhiteboardAccess);

      actions.push(this.makeDropdownItem(
        'changeWhiteboardAccess',
        label,
        () => WhiteboardService.changeWhiteboardAccess(user.userId, !user.whiteboardAccess),
        'pen_tool',
      ));
    }

    if (allowedToSetPresenter && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'setPresenter',
        isMe(user.userId)
          ? intl.formatMessage(messages.takePresenterLabel)
          : intl.formatMessage(messages.makePresenterLabel),
        () => this.onActionsHide(assignPresenter(user.userId)),
        'presentation',
      ));
    }

    if (allowedToPromote && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'promote',
        intl.formatMessage(messages.PromoteUserLabel),
        () => this.onActionsHide(changeRole(user.userId, 'MODERATOR')),
        'promote',
      ));
    }

    if (allowedToDemote && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'demote',
        intl.formatMessage(messages.DemoteUserLabel),
        () => this.onActionsHide(changeRole(user.userId, 'VIEWER')),
        'user',
      ));
    }

    if (allowedToChangeUserLockStatus && isMeteorConnected) {
      const userLocked = user.locked && user.role !== ROLE_MODERATOR;
      actions.push(this.makeDropdownItem(
        'unlockUser',
        userLocked ? intl.formatMessage(messages.UnlockUserLabel, { 0: user.name })
          : intl.formatMessage(messages.LockUserLabel, { 0: user.name }),
        () => this.onActionsHide(toggleUserLock(user.userId, !userLocked)),
        userLocked ? 'unlock' : 'lock',
      ));
    }

    if (allowUserLookup && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'directoryLookup',
        intl.formatMessage(messages.DirectoryLookupLabel),
        () => this.onActionsHide(requestUserInformation(user.extId)),
        'user',
      ));
    }

    if (allowedToRemove && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'remove',
        intl.formatMessage(messages.RemoveUserLabel, { 0: user.name }),
        () => this.onActionsHide(mountModal(
          <RemoveUserModal
            intl={intl}
            user={user}
            onConfirm={removeUser}
          />,
        )),
        'circle_close',
      ));
    }

    return actions;
  }

  getDropdownMenuParent() {
    return findDOMNode(this.dropdown);
  }

  makeDropdownItem(key, label, onClick, icon = null, iconRight = null) {
    const { getEmoji } = this.props;
    return (
      <Dropdown.DropdownListItem
        {...{
          key,
          label,
          onClick,
          icon,
          iconRight,
        }}
        className={key === getEmoji ? styles.emojiSelected : null}
        data-test={key}
      />
    );
  }

  resetMenuState() {
    return this.setState({
      isActionsOpen: false,
      dropdownOffset: 0,
      dropdownDirection: 'top',
      dropdownVisible: false,
      showNestedOptions: false,
    });
  }


  handleScroll() {
    this.setState({
      isActionsOpen: false,
      showNestedOptions: false,
    });
  }

  /**
   * Check if the dropdown is visible, if so, check if should be draw on top or bottom direction.
   */
  checkDropdownDirection() {
    const { scrollArea } = this.props;
    if (this.isDropdownActivedByUser()) {
      const dropdown = this.getDropdownMenuParent();
      const dropdownTrigger = dropdown.children[0];
      const nextState = {
        dropdownVisible: true,
      };
      const dropdownContent = findDOMNode(this.dropdownContent);
      const dropdownBoundaries = dropdownContent.getBoundingClientRect();

      const isDropdownVisible = UserDropdown.checkIfDropdownIsVisible(
        dropdownBoundaries.y,
        dropdownBoundaries.height,
      );

      if (!isDropdownVisible && scrollArea) {
        const { offsetTop, offsetHeight } = dropdownTrigger;
        const offsetPageTop = (offsetTop + offsetHeight) - scrollArea.scrollTop;

        nextState.dropdownOffset = window.innerHeight - offsetPageTop;
        nextState.dropdownDirection = 'bottom';
      }

      this.setState(nextState);
    }
  }

  /**
  * Check if the dropdown is visible and is opened by the user
  *
  * @return True if is visible and opened by the user
  */
  isDropdownActivedByUser() {
    const { isActionsOpen, dropdownVisible } = this.state;

    return isActionsOpen && !dropdownVisible;
  }

  renderUserAvatar() {
    const {
      normalizeEmojiName,
      user,
      userInBreakout,
      breakoutSequence,
      meetingIsBreakout,
      voiceUser,
    } = this.props;

    const { clientType } = user;
    const isVoiceOnly = clientType === 'dial-in-user';

    const iconUser = user.emoji !== 'none'
      ? (<Icon iconName={normalizeEmojiName(user.emoji)} />)
      : user.name.toLowerCase().slice(0, 2);

    const iconVoiceOnlyUser = (<Icon iconName="audio_on" />);
    const userIcon = isVoiceOnly ? iconVoiceOnlyUser : iconUser;

    return (
      <UserAvatar
        moderator={user.role === ROLE_MODERATOR}
        presenter={user.presenter}
        talking={voiceUser.isTalking}
        muted={voiceUser.isMuted}
        listenOnly={voiceUser.isListenOnly}
        voice={voiceUser.isVoiceUser}
        noVoice={!voiceUser.isVoiceUser}
        color={user.color}
        whiteboardAccess={user.whiteboardAccess}
        emoji={user.emoji !== 'none'}
        avatar={user.avatar}
      >
        {
        userInBreakout
        && !meetingIsBreakout
          ? breakoutSequence : userIcon}
      </UserAvatar>
    );
  }

  render() {
    const {
      compact,
      currentUser,
      user,
      intl,
      isThisMeetingLocked,
      isMe,
      isRTL,
    } = this.props;

    const {
      isActionsOpen,
      dropdownVisible,
      dropdownDirection,
      showNestedOptions,
    } = this.state;

    const actions = this.getUsersActions();

    const userItemContentsStyle = {};

    userItemContentsStyle[styles.dropdown] = true;
    userItemContentsStyle[styles.userListItem] = !isActionsOpen;
    userItemContentsStyle[styles.usertListItemWithMenu] = isActionsOpen;

    const you = isMe(user.userId) ? intl.formatMessage(messages.you) : '';

    const presenter = (user.presenter)
      ? intl.formatMessage(messages.presenter)
      : '';

    const userAriaLabel = intl.formatMessage(
      messages.userAriaLabel,
      {
        0: user.name,
        1: presenter,
        2: you,
        3: user.emoji,
      },
    );

    const contents = (
      <div
        data-test={isMe(user.userId) ? 'userListItemCurrent' : 'userListItem'}
        className={!actions.length ? styles.userListItem : null}
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        <div className={styles.userItemContents}>
          <div className={styles.userAvatar}>
            {this.renderUserAvatar()}
          </div>
          {<UserName
            {...{
              user,
              compact,
              intl,
              isThisMeetingLocked,
              userAriaLabel,
              isActionsOpen,
              isMe,
            }}
          />}
        </div>
      </div>
    );

    if (!actions.length) return contents;
    const placement = `right ${dropdownDirection}`;
    return (
      <Dropdown
        ref={(ref) => { this.dropdown = ref; }}
        keepOpen={isActionsOpen || showNestedOptions}
        onShow={this.onActionsShow}
        onHide={this.onActionsHide}
        className={userItemContentsStyle}
        autoFocus={false}
        aria-haspopup="true"
        aria-live="assertive"
        aria-label={userAriaLabel}
        aria-relevant="additions"
        placement={placement}
        getContent={dropdownContent => this.dropdownContent = dropdownContent}
        tethered
      >
        <Dropdown.DropdownTrigger>
          {contents}
        </Dropdown.DropdownTrigger>
        <Dropdown.DropdownContent
          style={{
            visibility: dropdownVisible ? 'visible' : 'hidden',
          }}
          className={styles.dropdownContent}
          placement={placement}
        >
          <Dropdown.DropdownList
            ref={(ref) => { this.list = ref; }}
            getDropdownMenuParent={this.getDropdownMenuParent}
            onActionsHide={this.onActionsHide}
          >
            {actions}
          </Dropdown.DropdownList>
        </Dropdown.DropdownContent>
      </Dropdown>
    );
  }
}

UserDropdown.propTypes = propTypes;
export default withModalMounter(lockContextContainer(UserDropdown));
