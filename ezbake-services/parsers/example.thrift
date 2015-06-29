/**
    An example thrift file used for unit testing of the thrift parser.
*/

/**
* Comment1
*/

/**Comment2*/

namespace java com.example.org
namespace perl Example.Org
namespace js example.org

typedef string Name
typedef set<string> Names

enum testNum {
    ZERO = 0,
    ONE = 1,
    TWO = 2,
    THREE = 3
}

enum aNum {
    YUP,
    TEST,
    WINNING
}

enum sNum {
    SINGLE
}

struct EzSecurityToken {
    1:required string user
}

struct EzSecurityTokenException {
    1:required string err
}

struct Members {
    1:optional Names apps
    2:optional Names users
}

struct Permissions {
    1:required bool dataAccess = false
    2:required bool adminRead = false
    3:required bool adminWrite = false
    4:required bool adminManage = false
    5:required bool adminCreateChild = false
}

exception Exceptional {
    1:required string message
    2:required string operation
}

service Tester {
    string getName()
    map<string, string> getOptions(1: string key)
}

service Singler {
    string test()
}

service Testing extends Tester {
    string getAnotherName();

    void createGroup(
        1:required EzSecurityToken token,
        2:required string parent
        3:required string name,
        4:required string parentGroupInheritance,
    ) throws (
        1:Exceptional tokenError,
        2:Exceptional authorizationError,
        3:Exceptional createError
    );

    void createStuff(
        1:required EzSecurityToken token,
        2:bool whateverStuff=true
    ), /* methods can be separated by commas */

    void createGroupWithInclusion(
        1:required EzSecurityToken token,
        2:required string parent,
        3:required string name,
        4:required string parentGroupInheritance,
        5:bool includeOnlyRequiresUser=false,
        6:bool includedIfAppInChain=true
    ) throws (
        1:Exceptional tokenError,
        2:Exceptional authorizationError,
        3:Exceptional createError
    );

    void deactivateGroup(
        1:required EzSecurityToken token,
        2:required string groupName,
        3:bool andChildren=false
    ) throws (
        1:Exceptional tokenError,
        2:Exceptional authorizationError,
        3:Exceptional createError
    );
}
