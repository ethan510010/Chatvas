const mySQL = require('mysql');
const { mySQLConfig } = require('../config/mysql')

const mySQLPool = mySQL.createPool(mySQLConfig);

// generalUse
function exec(sql) {
  return new Promise((resolve, reject) => {
    mySQLPool.query(sql, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    })
  })
}

function execWithParaObj(sql, paraObj) {
  return new Promise((resolve, reject) => {
    mySQLPool.query(sql, paraObj, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    })
  })
}

// Create Room and Binding user
function createRoomTransaction(roomSQL, junstionSQL, userIdList) {
  return new Promise((resolve, reject) => {
    mySQLPool.getConnection((err, connection) => {
      if (err) {
        connection.release();
        reject(err);
        return;
      }
      connection.beginTransaction((transactionErr) => {
        if (transactionErr) {
          return connection.rollback(() => {
            connection.release();
            reject(transactionErr);
          })
        }
        connection.query(roomSQL, (err, result) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              reject(err);
            })
          }
          const roomId = result.insertId;
          for (let index = 0; index < userIdList.length; index++) {
            const eachUserId = userIdList[index];
            connection.query(junstionSQL, [roomId, eachUserId], (err, result) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  reject(err);
                })
              }
            })
          }
          connection.commit((commitErr) => {
            if (commitErr) {
              return connection.rollback(() => {
                connection.release();
                reject(commitErr);
              })
            }
            resolve({
              channelId: roomId,
              allUsers: userIdList
            });
            connection.release();
            console.log('新增 Room 及綁定 User 成功');
          })
        })
      })
    })
  })
}

// Create User use
function createGeneralUser(userBasicSQL, userDetailsSQL, userInfoObj) {
  return new Promise((resolve, reject) => {
    mySQLPool.getConnection((err, connection) => {
      if (err) {
        connection.release();
        reject(err);
        return;
      }
      connection.beginTransaction((transactionErr) => {
        // 有錯誤
        if (transactionErr) {
          return connection.rollback(() => {
            connection.release();
            reject(transactionErr);
          })
        }
        // 沒有錯誤
        connection.query(userBasicSQL, [userInfoObj.accessToken,
        userInfoObj.fbAccessToken,
        userInfoObj.provider,
        userInfoObj.expiredDate,
        userInfoObj.beInvitedRoomId], (insertBasicErr, result) => {
          if (insertBasicErr) {
            return connection.rollback(() => {
              connection.release();
              reject(insertBasicErr);
            })
          }
          const userId = result.insertId;
          // 要帶進去的參數根據 provider 變換
          let parameters = [];
          switch (userInfoObj.provider) {
            case 'native':
              parameters = [userInfoObj.avatarUrl, userInfoObj.email, userInfoObj.password, userInfoObj.name, userId]
              break;
            case 'facebook':
              parameters = [userInfoObj.avatarUrl, userInfoObj.name, userInfoObj.email, userId]
              break;
          }
          connection.query(userDetailsSQL, parameters, (insertDetailErr, result) => {
            if (insertDetailErr) {
              return connection.rollback(() => {
                connection.release();
                reject(insertDetailErr);
              })
            }
            // 每個新創建的用戶都會被綁定到 general 這個 room，這個 room 的 id 都是 1
            // 但如果是被邀請的人，下面的 roomId 就不是1，而是被邀請的 roomId
            let userRoomJunctionRoomId = userInfoObj.beInvitedRoomId ? userInfoObj.beInvitedRoomId : 1;
            connection.query(`
              insert into user_room_junction 
              set roomId=${userRoomJunctionRoomId},
              userId=${userId}
            `, (insertRoomErr, result) => {
              if (insertRoomErr) {
                return connection.rollback(() => {
                  connection.release();
                  reject(insertRoomErr);
                })
              }
              connection.commit((commitErr) => {
                if (commitErr) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(commitErr);
                  })
                }
                console.log('新增用戶成功')
                resolve(userId);
                connection.release();
              })
            })
          })
        })
      })
    })
  })
}

// update FBUser use
function updateFBUserInfo(generalUserSQL, fbUserSQL, userDetailObj) {
  return new Promise((resolve, reject) => {
    mySQLPool.getConnection((err, connection) => {
      if (err) {
        connection.release();
        reject(err);
        return;
      }
      connection.beginTransaction((transactionErr) => {
        // 有錯誤
        if (transactionErr) {
          return connection.rollback(() => {
            connection.release();
            reject(transactionErr);
          })
        }
        // 沒有錯誤
        connection.query(generalUserSQL, [userDetailObj.accessToken,
        userDetailObj.fbAccessToken,
        userDetailObj.provider,
        userDetailObj.expiredDate,
        userDetailObj.beInvitedRoomId], (insertBasicErr, result) => {
          if (insertBasicErr) {
            return connection.rollback(() => {
              connection.release();
              reject(insertBasicErr);
            })
          }
          connection.query(fbUserSQL, [userDetailObj.avatarUrl, userDetailObj.fbUserName, userDetailObj.fbEmail], (insertDetailErr, result) => {
            if (insertDetailErr) {
              return connection.rollback(() => {
                connection.release();
                reject(insertDetailErr);
              })
            }
            // 如果有 beInvitedRoomId (beInvitedRoomId 不是 undefined)，代表是被邀請的，
            // 就必須再 insert 到 user_room_junction 這張 table
            // 否則代表是一般 FB 重新登入，就不需此步驟
            if (userDetailObj.beInvitedRoomId) {
              connection.query(`insert into user_room_junction 
                set roomId=${userDetailObj.beInvitedRoomId}, 
                userId=${userDetailObj.userId}
              `, (insertRoomJunctionErr, result) => {
                if (insertRoomJunctionErr) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(commitErr);
                  })
                }
                connection.commit((commitErr) => {
                  if (commitErr) {
                    return connection.rollback(() => {
                      connection.release();
                      reject(commitErr);
                    })
                  }
                  console.log('更新FB用戶成功')
                  resolve(userDetailObj.userId);
                  connection.release();
                })
              })
            } else {
              connection.commit((commitErr) => {
                if (commitErr) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(commitErr);
                  })
                }
                console.log('更新FB用戶成功')
                resolve(userDetailObj.userId);
                connection.release();
              })
            }
          })
        })
      })
    })
  })
}

function updateGeneralUserTransaction(updateGeneralUserSQL, insertRoomJunctionSQL, userObj) {
  return new Promise((resolve, reject) => {
    mySQLPool.getConnection((err, connection) => {
      if (err) {
        connection.release();
        reject(err);
        return;
      }
      connection.beginTransaction((transactionErr) => {
        // 有錯誤
        if (transactionErr) {
          return connection.rollback(() => {
            connection.release();
            reject(transactionErr);
          })
        }
        connection.query(updateGeneralUserSQL, [
          userObj.token,
          userObj.expiredTime
        ], (updateErr, result) => {
            if (updateErr) {
              return connection.rollback(() => {
                connection.release();
                reject(commitErr);
              })
            }
            // 區分是否為被邀清進 namespace
            // 沒有 beInvitedRoomId 代表為一般重新登入
            if (!userObj.beInvitedRoomId) {
              connection.commit((commitErr) => {
                if (commitErr) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(commitErr);
                  })
                }
                console.log('更新一般用戶成功')
                resolve(userObj.userId);
                connection.release();
              })
            // 有 beInvitedRoomId 代表為有被邀請的重新登入
            } else {
              connection.query(insertRoomJunctionSQL, [userObj.userId, userObj.beInvitedRoomId], (err, result) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(err);
                  })
                }
                connection.commit((commitErr) => {
                  if (commitErr) {
                    return connection.rollback(() => {
                      connection.release();
                      reject(commitErr);
                    })
                  }
                  console.log('更新一般用戶成功')
                  resolve(userObj.userId);
                  connection.release();
                })
              })
            }
          })
      })
    })
  })
}

// 儲存聊天訊息
function createMessageRecord(insertMsgSQL, messageObj) {
  return new Promise((resolve, reject) => {
    mySQLPool.query(insertMsgSQL,
      [messageObj.createdTime, messageObj.messageContent, messageObj.userId, messageObj.roomId, messageObj.messageType],
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      })
  })
}

// 更新房間用戶
function updateRoomMember(updateRoomSQL, roomId, userIdList) {
  return new Promise((resolve, reject) => {
    mySQLPool.getConnection((err, connection) => {
      if (err) {
        connection.release();
        reject(err);
        return;
      }
      connection.beginTransaction((transactionErr) => {
        if (transactionErr) {
          return connection.rollback(() => {
            connection.release();
            reject(transactionErr);
          })
        }
        for (let i = 0; i < userIdList.length; i++) {
          const userId = userIdList[i];
          connection.query(updateRoomSQL, [roomId, userId], (err, result) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                reject(err);
              })
            }
          });
        }
        connection.commit((commitErr) => {
          if (commitErr) {
            return connection.rollback(() => {
              connection.release();
              reject(commitErr);
            })
          }
          resolve({
            roomId: roomId,
            userIdList: userIdList
          });
          connection.release();
          console.log('更新房間用戶成功');
        })
      })
    })
  })
}

// canvasTransaction 
function handleRoomCanvas(readQuery, insertQuery, updateQuery) {
  return new Promise((resolve, reject) => {
    mySQLPool.getConnection((err, connection) => {
      if (err) {
        connection.release();
        reject(err);
        return;
      }
      connection.beginTransaction((transactionErr) => {
        if (transactionErr) {
          return connection.rollback(() => {
            connection.release();
            reject(transactionErr);
          })
        }
        connection.query(readQuery, (err, result) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              reject(err);
            })
          }
          if (result.length === 0) {
            connection.query(insertQuery, (err, result) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  reject(err);
                })
              }
              connection.commit((commitErr) => {
                if (commitErr) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(commitErr);
                  })
                }
                resolve({
                  insertResult: result
                })
                connection.release();
                console.log('儲存 canvas 成功');
              })
            })
          } else {
            connection.query(updateQuery, (err, result) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  reject(err);
                })
              }
              connection.commit((commitErr) => {
                if (commitErr) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(commitErr);
                  })
                }
                resolve({
                  updateResult: result
                })
                connection.release();
                console.log('更新 canvas 成功');
              })
            })
          }
        })
      })
    })
  })
}

// create a namespace and binding general room transaction
function createNameSpaceTransaction(createNamespaceSQL, namespaceName, createNamespaceUserId) {
  return new Promise((resolve, reject) => {
    mySQLPool.getConnection((err, connection) => {
      if (err) {
        connection.release();
        reject(err);
        return;
      }
      connection.beginTransaction((transactionErr) => {
        if (transactionErr) {
          return connection.rollback(() => {
            connection.release();
            reject(transactionErr);
          })
        }
        connection.query(createNamespaceSQL, [namespaceName], (err, result) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              reject(err);
            })
          }
          const newNamespaceId = result.insertId;
          connection.query(`
            insert into room 
            set name='general', 
            namespaceId=${newNamespaceId}
            `, (insertRoomErr, result) => {
            if (insertRoomErr) {
              return connection.rollback(() => {
                connection.release();
                reject(insertNamespaceErr);
              })
            }
            // 新的 namespace 預設的 general room 的 id
            const newNamespaceGeneralRoomId = result.insertId;
            connection.query(`update user set 
                  last_selected_room_id=${newNamespaceGeneralRoomId} 
                  where id=${createNamespaceUserId}`, (updateErr, result) => {
              if (updateErr) {
                return connection.rollback(() => {
                  connection.release();
                  reject(updateErr);
                })
              }
              connection.query(`insert into user_room_junction 
                    set roomId=${newNamespaceGeneralRoomId}, userId=${createNamespaceUserId}`,
                (insertErr, result) => {
                  if (insertErr) {
                    return connection.rollback(() => {
                      connection.release();
                      reject(insertErr);
                    })
                  }
                  connection.commit((commitErr) => {
                    if (commitErr) {
                      return connection.rollback(() => {
                        connection.release();
                        reject(commitErr);
                      })
                    }
                    console.log('新增 namespace 及綁定預設房間成功')
                    resolve({
                      newNamespaceId: newNamespaceId,
                      newDefaultRoomId: newNamespaceGeneralRoomId,
                      newNamespaceName: namespaceName
                    })
                    connection.release();
                  })
                })
            })
          })
        })
      })
    })
  })
}

// update namespace transaction
function updateNamespaceTransaction(namespaceName, selectDefaultRoomSQL, updateNamespaceSQL) {
  return new Promise((resolve, reject) => {
    mySQLPool.getConnection((err, connection) => {
      if (err) {
        connection.release();
        reject(err);
        return;
      }
      connection.beginTransaction((transactionErr) => {
        if (transactionErr) {
          return connection.rollback(() => {
            connection.release();
            reject(transactionErr);
          })
        }
        connection.query(selectDefaultRoomSQL, (err, result) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              reject(err);
            })
          }
          if (result.length > 0) {
            const defaultRoomId = result[0].roomId;
            connection.query(updateNamespaceSQL, [namespaceName], (err, result) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  reject(err);
                })
              }
              connection.commit((commitErr) => {
                if (commitErr) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(commitErr);
                  })
                }
                resolve({
                  defaultRoomId: defaultRoomId
                })
                connection.release();
                console.log('更新 namespace 成功');
              })
            })
          }
        })
      })
    })
  })
}

module.exports = {
  exec,
  execWithParaObj,
  createGeneralUser,
  updateFBUserInfo,
  escape: mySQL.escape,
  createRoomTransaction,
  createMessageRecord,
  updateRoomMember,
  handleRoomCanvas,
  createNameSpaceTransaction,
  updateNamespaceTransaction,
  updateGeneralUserTransaction
}

