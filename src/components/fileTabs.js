import {connect} from 'react-redux';
import React from 'react'
import RaisedButton from 'material-ui/RaisedButton';

import NavigationClose from 'material-ui/svg-icons/navigation/close';
import {grey700, grey900} from 'material-ui/styles/colors';

import {getOpenFileList} from '../reducers';
import * as actions from '../actions';

import './fileTabs.css';

const OpenFileTabsComponent = React.createClass({
    render: function(){
        return <ul className="fileTabs">
            {this.props.openFilesList.map(({fileName, openInEditor}) => 
                    <RaisedButton key={fileName + '-li'} onClick={() => {this.props.clickFileTab(fileName, openInEditor)}}
                    disabled={openInEditor ? true : false}
                    >{' ' + fileName + ' '}
                    <sup key={fileName + '-sup'}
                        onClick={(event)=>{
                        this.props.closeFileTab(event, fileName, openInEditor, this.props.openFilesList)
                        event.stopPropagation();
                    }}>
                    <NavigationClose color={grey700} hoverColor={grey900} />
                    </sup>
                    </RaisedButton>
                )}
        </ul>
    }
});


/**
 * clicking on a file tab dispatch code
 * 
 *  This handles updating the editor.
 *  This also handles updating the tabs.
 */
const clickTabLogic = (fileName, openInEditor, dispatch) => {
    if (!openInEditor){
        dispatch(actions.changeOpenFileTab(fileName));
        dispatch(actions.getTextForOpenFile(fileName));
    }
}

const closeTabLogic = (event, fileName, openInEditor, fileList, dispatch) => {
    dispatch(actions.removeOpenFileName(fileName));
    event.stopPropagation();
    if (!openInEditor){
        return null
    }
    // We need to open a different code window.
    dispatch(actions.changeToLastFileTab());

    const file = fileList.filter(v => v.fileName !== fileName).last();
    if (file){
        dispatch(actions.getTextForOpenFile(file.fileName));
    } else {
        dispatch(actions.fetchFileText())
    }
    
}


const mapStateToProps = state => ({
    openFilesList: getOpenFileList(state)
});

const mapDispatchToProps = dispatch => ({
    clickFileTab: (fileName, openInEditor) => clickTabLogic(fileName, openInEditor, dispatch),
    closeFileTab: (event, fileName, openInEditor, fileList) => closeTabLogic(event, fileName, openInEditor, fileList, dispatch)
});

export const OpenFileTabs = connect(
    mapStateToProps,
    mapDispatchToProps
)(OpenFileTabsComponent)