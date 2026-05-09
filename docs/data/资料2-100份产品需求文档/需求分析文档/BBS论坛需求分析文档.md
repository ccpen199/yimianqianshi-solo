# BBS论坛需求分析文档

> 来源：BBS论坛需求分析文档.doc
> 转换工具：textutil-fallback

TOC \o "1-3" \h \z \u  HYPERLINK \l "_Toc428429405" 目    录	 PAGEREF _Toc428429405 \h 1
 HYPERLINK \l "_Toc428429406" 1 引言	 PAGEREF _Toc428429406 \h 1
 HYPERLINK \l "_Toc428429407" 1.1 论坛发展概况	 PAGEREF _Toc428429407 \h 1
 HYPERLINK \l "_Toc428429408" 1.2 技术选择	 PAGEREF _Toc428429408 \h 4
 HYPERLINK \l "_Toc428429409" 1.2.1 BS结构	 PAGEREF _Toc428429409 \h 4
 HYPERLINK \l "_Toc428429410" 1.2.2 Java技术	 PAGEREF _Toc428429410 \h 5
 HYPERLINK \l "_Toc428429411" 1.3 开发工具	 PAGEREF _Toc428429411 \h 7
 HYPERLINK \l "_Toc428429412" 2 需求分析	 PAGEREF _Toc428429412 \h 8
 HYPERLINK \l "_Toc428429413" 2.1软件分层与部署	 PAGEREF _Toc428429413 \h 8
 HYPERLINK \l "_Toc428429414" 2.2 系统功能模块	 PAGEREF _Toc428429414 \h 9
 HYPERLINK \l "_Toc428429415" 2.3 系统运行流程	 PAGEREF _Toc428429415 \h 10
 HYPERLINK \l "_Toc428429416" 3  系统设计	 PAGEREF _Toc428429416 \h 11
 HYPERLINK \l "_Toc428429417" 3.1 业务模型	 PAGEREF _Toc428429417 \h 11
 HYPERLINK \l "_Toc428429418" 3.2 数据库设计	 PAGEREF _Toc428429418 \h 13
 HYPERLINK \l "_Toc428429419" 3.2.1管理员表（admin_group）	 PAGEREF _Toc428429419 \h 14
 HYPERLINK \l "_Toc428429420" 3.2.2 游客表（guest）	 PAGEREF _Toc428429420 \h 14
 HYPERLINK \l "_Toc428429421" 3.2.3 用户表（user）	 PAGEREF _Toc428429421 \h 14
 HYPERLINK \l "_Toc428429422" 3.2.4 文章大类表（large_class）	 PAGEREF _Toc428429422 \h 14
 HYPERLINK \l "_Toc428429423" 3.2.5 文章子类表（sub_class）	 PAGEREF _Toc428429423 \h 15
 HYPERLINK \l "_Toc428429424" 3.2.6 文章表（article）	 PAGEREF _Toc428429424 \h 15
 HYPERLINK \l "_Toc428429425" 3.2.6 文章操作表（operatelog）	 PAGEREF _Toc428429425 \h 15
 HYPERLINK \l "_Toc428429426" 3.2.6 角色表（role）	 PAGEREF _Toc428429426 \h 15
 HYPERLINK \l "_Toc428429427" 3.2.6 角色权限表（role_permission）	 PAGEREF _Toc428429427 \h 16
 HYPERLINK \l "_Toc428429428" 3.3 DAO 设计	 PAGEREF _Toc428429428 \h 16
 HYPERLINK \l "_Toc428429429" 3.3.1 DAO接口	 PAGEREF _Toc428429429 \h 16
 HYPERLINK \l "_Toc428429430" 3.3.2 DAO代理	 PAGEREF _Toc428429430 \h 18
 HYPERLINK \l "_Toc428429431" 3.3.3 DAO实现	 PAGEREF _Toc428429431 \h 21
 HYPERLINK \l "_Toc428429432" 3.3.4 DAO工厂	 PAGEREF _Toc428429432 \h 27
 HYPERLINK \l "_Toc428429433" 4 关健代码分析	 PAGEREF _Toc428429433 \h 28
 HYPERLINK \l "_Toc428429434" 4.1添加文章流程代码分析	 PAGEREF _Toc428429434 \h 28
 HYPERLINK \l "_Toc428429435" 5 总结	 PAGEREF _Toc428429435 \h 31


目    录
1 引言
1.1 论坛发展概况
什么是BBS论坛
　　那么什么是BBS（论坛）呢？BBS的英文全称是Bulletin Board System，翻译为中文就是“电子布告栏系统”。BBS最早是用来公布股市价格等类信息的，当时BBS连文件传输的功能都没有，而且只能在苹果机上运行。早期的BBS与一般街头和校园内的公告板性质相同，只不过是通过来传播或获得消息而已。一直到开始普及之后，有些人尝试将苹果计算机上的BBS转移到个人计算机上，BBS才开始渐渐普及开来。近些年来，由于爱好者们的努力，BBS的功能得到了很大的扩充。目前，通过BBS系统可随时取得各种最新的信息；也可以通过BBS系统来和别人讨论计算机……等等各种有趣的话题；还可以利用BBS系统来发布一些“征友”、“廉价转让”、“招聘人才”及“求职应聘”等启事；更可以召集亲朋好友到聊天室内高谈阔论……这个精彩的天地就在你我的身旁，只要您在一台可以访问互联网的计算机旁，就可以进入这个交流平台，来享用它的种种服务。
　　目前，通过BBS系统可随时取得国际最新的软件及信息，也可以通过BBS系统来和别 人讨论计算机软件、硬件、Internet、多媒体、程序设计以及医学等等各种有趣的话题，更可以利用BBS系统来刊登一些“征友”、“廉价转让”及“公司产品”等启事，而且这个园地就在你我的身旁。只要您拥有1台计算机、1只调制解调器和1条电话线，就能够进入这个“超时代”的领域，进而去享用它无比的威力！
　　首先说明一下，上面说的“论坛”一般就是大家口中常提的BBS。在网络以外的现实世界中，“论坛”是指一种高规格、有长期主办组织、多次召开的研讨会议。著名的论坛有：博鳌亚洲论坛，精英外贸论坛……
一种后缀修饰词，一般用于企业、个人、网站等用词。比如：80后之窗论坛、生活121论坛、企业论坛、爱看txt小说论坛、论坛会议、百度论坛等。

论坛的分类
　　论坛的发展也如同网络，雨后春笋般的出现，并迅速的发展壮大。现在的论坛几乎涵盖了我们生活的各个方面，几乎每一个人都可以找到自己感兴趣或者需要了解的专题性论坛，而各类网站，综合性门户网站或者功能性专题网站也都青睐于开设自己的论坛，以促进网友之间的交流，增加互动性和丰富网站的内容。　论坛就其专业性可分为以下两类：
　　一、综合类论坛
　　综合类的论坛包含的信息比较丰富和广泛，能够吸引几乎全部的网民来到论坛，但是由于广便难于精，所以这类的论坛往往存在着弊端即不能全部做到精细和面面俱到。通常大型的门户网站有足够的人气和凝聚力以及强大的后盾支持能够把门户类网站做到很强大，但是对于小型规模的网络公司，或个人简历的论坛站，就倾向于选择专题性的论坛，来做到精致。
　　二、专题类论坛


专题论坛
此类论坛是相对于综合类论坛而言，专题类的论坛，能够吸引真正志同道合的人一起来交流探讨，有利于信息的分类整合和搜集，专题性论坛对学术科研教学都起到重要的作用，例如购物类论坛、军事类论坛，情感倾诉类论坛，电脑爱好者论坛，动漫论坛，这样的专题性论坛能够在单独的一个领域里进行版块的划分设置，但是有的论坛，把专题性直接坐到最细化，这样往往能够取到更好的效果，如返利论坛、养猫人论坛等等，吉他论坛，90后创业论坛等。
论坛功能性
　　如果按照论坛的功能性来划分，又可分为
　　一、教学型论坛
　　这类论坛通常如同一些教学类的博客。或者是教学网站，中心放在对一种知识的传授和学习，在计算机软件等技术类的行业，这样的论坛发挥着重要的作用，通过在论坛里浏览帖子，发布帖子能迅速的与很多人在网上进行技术性的沟通和学习。譬如金蝶友商网。
　　二、推广型论坛
　　这类论坛通常不是很受网民的欢迎，因其生来就注定是要作为广告的形式，为某一个企业，或某一种产品进行宣传服务，从2005年起，这样形式的论坛很快的成立起来，但是往往这样的论坛，很难具有吸引人的性质，单就其宣传推广的性质，很难有大作为，所以这样的论坛寿命经常很短，论坛中的会员也几乎是由受雇佣的人员非自愿的组成。
　　三、地方性论坛
　　地方性论坛是论坛中娱乐性与互动性最强的论坛之一。不论是大型论坛中的地方站，还是专业的地方论坛，都有很热烈的网民反向，比如百度、长春贴吧、 北京贴吧 、山东同乡网或者是清华大学论坛 运城论坛长沙之家论坛 罗定E天空等，地方性论坛能够更大距离的拉近人与人的沟通，另外由于是地方性的论坛，所以对其中的网民也有了一定行的局域限制，论坛中的人或多或少都来自于相同的地方，这样即有那么点点的真实的安全感，也少不了网络特有的朦胧感，所以这样的论坛常常受到网民的欢迎。
　　四、交流性论坛
　　交流性的论坛又是一个广泛的大类，这样的论坛重点在于论坛会员之间的交流和互动，所以内容也较

交流论坛
丰富多样，有供求信息，交友信息，线上线下活动信息，新闻等，这样的论坛是将来论坛发展的大趋势。
1.2 技术选择
1.2.1 BS结构
	BS即浏览器和服务器结构。它是随着Internet技术的兴起，对C/S结构的一种变化或者改进的结构。在这种结构下，用户工作界面是通过WWW浏览器来实现，极少部分事务逻辑在前端(Browser)实现，但是主要事务逻辑在服务器端(Server)实现，形成所谓三层3-tier结构。这样就大大简化了客户端电脑载荷，减轻了系统维护与升级的成本和工作量，降低了用户的总体成本(TCO)。
　　以目前的技术看，局域网建立B/S结构的网络应用，并通过Internet/Intranet模式下数据库应用，相对易于把握、成本也是较低的。它是一次性到位的开发，能实现不同的人员，从不同的地点，以不同的接入方式(比如LAN, WAN, Internet/Intranet等)访问和操作共同的数据库;它能有效地保护数据平台和管理访问权限，服务器数据库也很安全 。特别是在JAVA这样的跨平台语言出现之后，B/S架构管理软件更是方便、快捷、高效。


1.2.2 Java技术
Java Web框架简介
Java 的 Web框架虽然各不相同，但基本也都是遵循特定的路数的：使用Servlet或者Filter拦截请求，使用MVC的思想设计架构，使用约定，XML或 Annotation实现配置，运用Java面向对象的特点，面向抽象实现请求和响应的流程，支持Jsp，Freemarker，Velocity等视图。
Struts 2
　　优点：
　　架构简单——易于扩展
　　标记库很容易利用FreeMarker或者Velocity来定制
　　基于控制器或者基于页面的导航
　　缺点：
　　文档组织得很差
对新特征过分关注
JDBC
	JDBC（Java Data Base Connectivity,java数据库连接）是一种用于执行SQL语句的Java API，可以为多种关系数据库提供统一访问，它由一组用Java语言编写的类和接口组成。JDBC为工具/数据库开发人员提供了一个标准的API，据此可以构建更高级的工具和接口，使数据库开发人员能够用纯 Java API 编写数据库应用程序，同时，JDBC也是个商标名。
　　有了JDBC，向各种关系数据发送SQL语句就是一件很容易的事。换言之，有了JDBC API，就不必为访问Sybase数据库专门写一个程序，为访问Oracle数据库又专门写一个程序，或为访问Informix数据库又编写另一个程序等等，程序员只需用JDBC API写一个程序就够了，它可向相应数据库发送SQL调用。同时，将Java语言和JDBC结合起来使程序员不必为不同的平台编写不同的应用程序，只须写一遍程序就可以让它在任何平台上运行，这也是Java语言“编写一次，处处运行”的优势。
　　Java数据库连接体系结构是用于Java应用程序连接数据库的标准方法。JDBC对Java程序员而言是API，对实现与数据库连接的服务提供商而言是接口模型。作为API，JDBC为程序开发提供标准的接口，并为数据库厂商及第三方中间件厂商实现与数据库的连接提供了标准方法。JDBC使用已有的SQL标准并支持与其它数据库连接标准，如ODBC之间的桥接。JDBC实现了所有这些面向标准的目标并且具有简单、严格类型定义且高性能实现的接口。
　　Java 具有坚固、安全、易于使用、易于理解和可从网络上自动下载等特性，是编写数据库应用程序的杰出语言。所需要的只是 Java应用程序与各种不同数据库之间进行对话的方法。而 JDBC 正是作为此种用途的机制。
　　JDBC 扩展了 Java 的功能。例如，用 Java 和 JDBC API 可以发布含有 applet 的网页，而该 applet 使用的信息可能来自远程数据库。企业也可以用 JDBC 通过 Intranet 将所有职员连到一个或多个内部数据库中（即使这些职员所用的计算机有 Windows、 Macintosh 和UNIX 等各种不同的操作系统）。随着越来越多的程序员开始使用Java 编程语言，对从 Java 中便捷地访问数据库的要求也在日益增加。
　　MIS 管理员们都喜欢 Java 和 JDBC 的结合，因为它使信息传播变得容易和经济。企业可继续使用它们安装好的数据库，并能便捷地存取信息，即使这些信息是储存在不同数据库管理系统上。新程序的开发期很短。安装和版本控制将大为简化。程序员可只编写一遍应用程序或只更新一次，然后将它放到服务器上，随后任何人就都可得到最新版本的应用程序。对于商务上的销售信息服务， Java 和JDBC 可为外部客户提供获取信息更新的更好方法。
简单地说，JDBC 可做三件事：与数据库建立连接、发送 操作数据库的语句并处理结果。
JDBC 是个"低级"接口，也就是说，它用于直接调用 SQL 命令。在这方面它的功能极佳，并比其它的数据库连接 API 易于使用，但它同时也被设计为一种基础接口，在它之上可以建立高级接口和工具。高级接口是"对用户友好的"接口，它使用的是一种更易理解和更为方便的 API，这种API在幕后被转换为诸如 JDBC 这样的低级接口。
　　在关系数据库的"对象/关系"映射中，表中的每行对应于类的一个实例，而每列的值对应于该实例的一个属性。于是，程序员可直接对 Java 对象进行操作；存取数据所需的 SQL 调用将在"掩盖下"自动生成。此外还可提供更复杂的映射，例如将多个表中的行结合进一个 Java 类中。
　　随着人们对 JDBC 的兴趣日益增涨，越来越多的开发人员一直在使用基于 JDBC 的工具，以使程序的编写更加容易。程序员也一直在编写力图使最终用户对数据库的访问变得更为简单的应用程序。例如应用程序可提供一个选择数据库任务的菜单。任务被选定后，应用程序将给出提示及空白供填写执行选定任务所需的信息。所需信息输入应用程序将自动调用所需的 SQL 命令。在这样一种程序的协助下，即使用户根本不懂 SQL 的语法，也可以执行数据库任务。

1.3 开发工具
MyEclipse企业级工作平台（MyEclipse Enterprise Workbench ，简称MyEclipse）是对EclipseIDE的扩展，利用它我们可以在数据库和JavaEE的开发、发布以及应用程序服务器的整合方面极大的提高工作效率。它是功能丰富的JavaEE集成开发环境，包括了完备的编码、调试、测试和发布功能，完整支持HTML,Struts,JSP,CSS,Javascript,SQL,Hibernate。
编辑本段分类
　　在结构上，MyEclipse的特征可以被分为7类：
　　1． JavaEE模型
　　2． WEB开发工具
　　3． EJB开发工具
　　4． 应用程序服务器的连接器
　　5． JavaEE项目部署服务
　　6． 数据库服务
　　7． MyEclipse整合帮助
　　对于以上每一种功能上的类别，在Eclipse中都有相应的功能部件，并通过一系列的插件来实现它们。MyEclipse结构上的这种模块化，可以让我们在不影响其他模块的情况下，对任一模块进行单独的扩展和升级。
　　简单而言，MyEclipse是Eclipse的插件，也是一款功能强大的JavaEE集成开发环境，支持代码编写、配置、测试以及除错，MyEclipse6.0以前版本需先安装Eclipse。MyEclipse6.0以后版本安装时不需安装Eclipse。
2 需求分析
2.1软件分层与部署
	分层是软件设计中非常重要的思想，特别是面对较大的软件系统。分而治之是计算机中经常采用的一种方法。比如TCP/IP七层协议栈就是典型的分层应用。任何一个合格的软件开发者都必须掌握的分层思想。下面是软件分层的几个基本概念：  一、分层
    1、经典的三层理论将应用分为三个层次      （1）表现层(Presentation Layer)：显示信息，处理用户的请求      （2）领域/逻辑层(Domain Logic Layer)：逻辑，实际的业务活动，系统中真正的核心      （3）数据访问层(Data Access Layer)：与数据库、消息系统等的通信
     实际应用中，有四层的五层(如：J2EE)的。在 Windows .NET 中表示层可以通用数据感知组件访问数据库，使用很方便。但是这种技术破坏了层和层之间的依赖关系，对于大型软件的开发一般是不允许的，小型软件使用也未尝不可。
   2、基本原则：领域层和数据源层绝对不要依赖于表现层。
 二、表现层
    用户界面，Web页面或Windows窗体。
 三、领域层
    领域逻辑的组织，三个模式：     （1）事务脚本：结构化      （2）领域模型：面向对象     （3）表模块：与记录集相关。.NET中含有基于记录集的工具(DataTable/DataSet)，则使用表模块较为方便。
 四、数据访问层
    为数据库表建立入口，使用入口的两种基本方法：     （1）行数据入口：每一行一个实例，面向对象的方式。     （2）表数据入口：记录集，如.NET中的DataTable，DataSet
2.2 系统功能模块


2.3 系统运行流程


帖子发布流程 ：


N


           Y


3  系统设计
3.1 业务模型


控制器
　　struts中，基本的控制器组件是ActionServlet类中的实例servlet，实际使用的servlet在配置文件中由一组映射（由ActionMapping类进行描述）进行定义。
Struts对Model，View和Controller都提供了对应的组件。
　　ActionServlet，这个类是Struts的核心控制器，负责拦截来自用户的请求。
　　Action，这个类通常由用户提供，该控制器负责接收来自ActionServlet的请求，并根据该请求调用模型的业务逻辑方法处理请求，并将处理结果返回给JSP页面显示。
Model部分
　　由JavaBean组成，ActionForm用于封装用户的请求参数，封装成ActionForm对象，该对象被ActionServlet转发给Action，Action根据ActionForm里面的请求参数处理用户的请求。
　　JavaBean则封装了底层的业务逻辑，包括数据库访问等。
View部分
　　该部分采用JSP实现。
　　Struts提供了丰富的标签库，通过标签库可以减少脚本的使用，自定义的标签库可以实现与Model的有效交互，并增加了现实功能。对应上图的JSP部分。
Controller组件
　　Controller组件有两个部分组成——系统核心控制器，业务逻辑控制器。
　　系统核心控制器，对应上图的ActionServlet。该控制器由Struts框架提供，继承HttpServlet类，因此可以配置成标注的Servlet。该控制器负责拦截所有的HTTP请求，然后根据用户请求决定是否要转给业务逻辑控制器。
　　业务逻辑控制器，负责处理用户请求，本身不具备处理能力，而是调用Model来完成处理。对应Action部分。
编辑本段框架
　　struts框架具有组件的模块化，灵活性和重用性的优点，同时简化了基于MVC的web应用程序的开发。
　　struts可以清晰地区分控制，事务逻辑和外观，从而简化了开发应用程序的过程。struts提供的类使得开发工作更加简单，这些类包括：
　　a. 控制程序流程的类
　　b. 实现和执行程序事务逻辑的类
　　c. 自定义的标记库使得创建和验证HTML表单更加容易
3.2 数据库设计

3.2.1管理员表（admin_group）


3.2.2 游客表（guest）

3.2.3 用户表（user）


3.2.4 文章大类表（large_class）


3.2.5 文章子类表（sub_class）


3.2.6 文章表（article）


3.2.6 文章操作表（operatelog）


3.2.6 角色表（role）


3.2.6 角色权限表（role_permission）


3.3 DAO 设计
     多个DAO接口;
     多个代理类; 3.     实现DAO接口的具体类;  4.     数据传递对象;
5.     一个DAO工厂类.
3.3.1 DAO接口


package org.gg.dao;
import java.util.List;
public interface IDAO<T, K> {
	public boolean doCreate(T vo) throws Exception;
	public boolean doUpdate(T vo) throws Exception;
	public boolean doRemove(Double id) throws Exception;
	public List<T> findAll(String keyWord) throws Exception;
	public List<T> findAll(String keyWord,Double currentPage,Double lineSize) throws Exception;

	public Double findAllCount() throws Exception;
}
package org.gg.dao;
import org.gg.vo.Article;
public interface IArticleDAO extends IDAO<Article, Double> {
	public Double getCount(Double aid) throws Exception; // 获得文章的方问次数
	public void setCount(Double aid, Double count) throws Exception; // 设置文章的方问次数
	public Article findById(Double aid) throws Exception;
	public Article findRecentlyArticle(Double id) throws Exception; // 获得某人最近发的一篇文章
}
package org.gg.dao;
import org.gg.vo.LargeClass;
public interface ILargeClassDAO extends IDAO<LargeClass, String> {
	public LargeClass findById(Double id) throws Exception;
}
package org.gg.dao;
import org.gg.vo.Role;
public interface IRoleDAO extends IDAO<Role, Double> {
	public Role findById(Double rid) throws Exception;
}
package org.gg.dao;
import org.gg.vo.RolePermission;
Public interface IRolePermissionDAO
                     extends IDAO<RolePermission,Double> {
}
package org.gg.dao;
import java.util.List;
import org.gg.vo.SubClass;
public interface ISubClassDAO extends IDAO<SubClass, String> {
	public List<SubClass> findById(Double lid) throws Exception; // 查找某一大类下的所有子类
	public boolean doRemove(Double lid, Double sid) throws Exception; // 删除某一大类下的一个子类
	public SubClass findById(Double lid, Double sid) throws Exception; // 查找某一大类下的一个子类
}
package org.gg.dao;
import org.gg.vo.User;
public interface IUserDAO extends IDAO<User, String> {
	public boolean findLogin(User vo) throws Exception;
	public User findById(Double id) throws Exception;
	public User findByName(String name) throws Exception ;
}
3.3.2 DAO代理


package org.gg.dao.proxy;
import java.util.List;
import org.gg.dao.IArticleDAO;
import org.gg.dao.impl.ArticleDAOImpl;
import org.gg.dbc.DatabaseConnection;
import org.gg.vo.Article;
public class ArticleDAOProxy implements IArticleDAO {
	private DatabaseConnection dbc = null;
	private IArticleDAO dao = null;
	private Double count; // 保存文章表记录条数
	public ArticleDAOProxy() {
		this.dbc = new DatabaseConnection();
		this.dao = new ArticleDAOImpl(this.dbc.getConnection());
	}
	public boolean doCreate(Article vo) {
		boolean flag = false;
		try {
			flag = this.dao.doCreate(vo);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return flag;
	}
	public boolean doRemove(Double aid) {
		boolean flag = false;
		try {
			flag = this.dao.doRemove(aid);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return flag;
	}
	public boolean doUpdate(Article vo) {
		boolean flag = false;
		try {
			flag = this.dao.doUpdate(vo);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return flag;
	}
	public List<Article> findAll(String keyWord, Double currentPage,
			Double lineSize) {
		List<Article> list = null;
		try {
			list = this.dao.findAll(keyWord, currentPage, lineSize);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return list;
	}
	public List<Article> findAll(String keyWord) {
		List<Article> list = null;
		try {
			list = this.dao.findAll(keyWord);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return list;
	}
	public Double findAllCount() {
		try {
			this.count = this.dao.findAllCount();
		} catch (Exception e) {
			e.printStackTrace();
		}
		return this.count;
	}
	public Double getCount(Double aid) { // 获得文章的方问次数
		Double count = 0.0;
		try {
			count = this.dao.getCount(aid);
		} catch (Exception e) {
			e.printStackTrace();
		}

		return count;
	}
	public void setCount(Double aid, Double count) {
		try {
			this.dao.setCount(aid, count);
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	public Article findById(Double aid) {
		Article article = null;
		try {
			article = dao.findById(aid);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return article;
	}
	public Article findRecentlyArticle(Double id) {
		Article article = null;
		try {
			article = this.dao.findRecentlyArticle(id);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return article;
	}
}
后面略……


3.3.3 DAO实现


package org.gg.dao.impl;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

import org.gg.dao.IArticleDAO;
import org.gg.vo.Article;

public class ArticleDAOImpl implements IArticleDAO {

	private Connection conn = null;
	private PreparedStatement pstmt = null;
	private Double count; // 保存文章表记录条数

	public ArticleDAOImpl(Connection conn) {
		this.conn = conn;
	}


	public boolean doCreate(Article vo) throws Exception {
		boolean flag = false;
		String sql = "INSERT INTO article(id,sid,title,content,createtime,lastedittime,visitcount,locked) VALUES(?,?,?,?,?,?,?,?)";
		this.pstmt = this.conn.prepareStatement(sql);
		this.pstmt.setDouble(1, vo.getId());
		this.pstmt.setDouble(2, vo.getSid());
		this.pstmt.setString(3, vo.getTitle());
		this.pstmt.setString(4, vo.getContent());
		this.pstmt.setTimestamp(5, new Timestamp(vo.getCreatetime().getTime()));
		this.pstmt.setTimestamp(6,
				new Timestamp(vo.getLastedittime().getTime()));
		this.pstmt.setDouble(7, vo.getVisitcount());
		this.pstmt.setBoolean(8, vo.isLocked());
		if (this.pstmt.executeUpdate() > 0) {
			flag = true;
		}
		return flag;
	}


	public boolean doRemove(Double aid) throws Exception {
		boolean flag = false;
		String sql = "DELETE  FROM article WHERE aid=?";
		this.pstmt = this.conn.prepareStatement(sql);
		this.pstmt.setDouble(1, aid);
		if (this.pstmt.executeUpdate() > 0) {
			flag = true;
		}
		return flag;
	}


	public boolean doUpdate(Article vo) throws Exception {
		boolean flag = false;
		String sql = "UPDATE article SET id=?,sid=?,title=?,content=?,lastedittime=?,locked=? WHERE aid=?";
		this.pstmt = this.conn.prepareStatement(sql);
		this.pstmt = this.conn.prepareStatement(sql);
		this.pstmt.setDouble(1, vo.getId());
		this.pstmt.setDouble(2, vo.getSid());
		this.pstmt.setString(3, vo.getTitle());
		this.pstmt.setString(4, vo.getContent());
		this.pstmt.setTimestamp(5,
				new Timestamp(vo.getLastedittime().getTime()));
		this.pstmt.setBoolean(6, vo.isLocked());
		this.pstmt.setDouble(7, vo.getAid());
		if (this.pstmt.executeUpdate() > 0) {
			flag = true;
		}
		return flag;
	}


	public List<Article> findAll(String keyWord, Double currentPage,
			Double lineSize) throws Exception {
		// TODO Auto-generated method stub
		return null;
	}


	public List<Article> findAll(String keyWord) throws Exception {
		List<Article> list = new ArrayList<Article>();
		ResultSet rs = null;
		Article article = null;
		String sql = "SELECT aid,id,sid,title,content,createtime,lastedittime,visitcount,locked FROM article WHERE title LIKE ? OR content LIKE ?";
		this.pstmt = this.conn.prepareStatement(sql);
		this.pstmt.setString(1, "%" + keyWord + "%");
		this.pstmt.setString(2, "%" + keyWord + "%");
		rs = this.pstmt.executeQuery();
		while (rs.next() && rs != null) {
			article = new Article();
			article.setAid(rs.getDouble(1));
			article.setId(rs.getDouble(2));
			article.setSid(rs.getDouble(3));
			article.setTitle(rs.getString(4));
			article.setContent(rs.getString(5));
			article.setCreatetime(rs.getTimestamp(6));
			article.setLastedittime(rs.getTimestamp(7));
			article.setVisitcount(rs.getDouble(8));
			article.setLocked(rs.getBoolean(9));
			list.add(article);
		}
		return list;
	}


	public Double findAllCount() throws Exception {
		String sql = "SELECT aid FROM article";
		this.count = 0.0;
		ResultSet rs = null;
		this.pstmt = this.conn.prepareStatement(sql);
		while (rs.next() && rs != null) {
			this.count++;
		}
		return this.count;
	}


	public Double getCount(Double aid) throws Exception {
		Double count = 0.0;
		ResultSet rs = null;
		String sql = "SELECT count FROM user WHERE aid=?";
		this.pstmt = this.conn.prepareStatement(sql);
		this.pstmt.setDouble(1, aid);
		if (rs.next() && rs != null) {
			count = rs.getDouble(1);
		}
		return count;
	}


	public void setCount(Double aid, Double count) throws Exception {
		String sql = "UPDATE user SET count=? WHERE aid=?";
		this.pstmt = this.conn.prepareStatement(sql);
		this.pstmt.setDouble(1, count);
		this.pstmt.setDouble(2, aid);

	}


	public Article findById(Double aid) throws Exception {
		ResultSet rs = null;
		Article article = new Article();
		String sql = "SELECT aid,id,sid,title,content,createtime,lastedittime,visitcount,locked FROM article WHERE aid=?";
		this.pstmt = this.conn.prepareStatement(sql);
		this.pstmt.setDouble(1, aid);
		rs = this.pstmt.executeQuery();
		if (rs.next() && rs != null) {
			article.setAid(rs.getDouble(1));
			article.setId(rs.getDouble(2));
			article.setSid(rs.getDouble(3));
			article.setTitle(rs.getString(4));
			article.setContent(rs.getString(5));
			article.setCreatetime(rs.getTimestamp(6));
			article.setLastedittime(rs.getTimestamp(7));
			article.setVisitcount(rs.getDouble(8));
			article.setLocked(rs.getBoolean(9));
		}
		return article;
	}


	public Article findRecentlyArticle(Double id) throws Exception {
		Article article = new Article();
		ResultSet rs = null;
		String sql = "SELECT aid,id,sid,title,content,createtime,lastedittime,visitcount,locked FROM article WHERE id=? " +
				"AND createtime=(SELECT MAX(createtime) FROM article)";
		this.pstmt = this.conn.prepareStatement(sql);
		this.pstmt.setDouble(1, id);
		rs = this.pstmt.executeQuery();

		if (rs.next() && rs != null) {
			article.setAid(rs.getDouble(1));
			article.setId(rs.getDouble(2));
			article.setSid(rs.getDouble(3));
			article.setTitle(rs.getString(4));
			article.setContent(rs.getString(5));
			article.setCreatetime(rs.getTimestamp(6));
			article.setLastedittime(rs.getTimestamp(7));
			article.setVisitcount(rs.getDouble(8));
			article.setLocked(rs.getBoolean(9));
		}
		return article;
	}

}
后面略……


3.3.4 DAO工厂


package org.gg.dao.factory;
import org.gg.dao.IArticleDAO;
import org.gg.dao.ILargeClassDAO;
import org.gg.dao.IRoleDAO;
import org.gg.dao.IRolePermissionDAO;
import org.gg.dao.ISubClassDAO;
import org.gg.dao.IUserDAO;
import org.gg.dao.proxy.ArticleDAOProxy;
import org.gg.dao.proxy.LargeClassDAOProxy;
import org.gg.dao.proxy.RoleDAOProxy;
import org.gg.dao.proxy.RolePermissionDAOProxy;
import org.gg.dao.proxy.SubClassDAOProxy;
import org.gg.dao.proxy.UserDAOProxy;

public class DAOFactory {
	public static IUserDAO getIUserDAOInstance() {
		return new UserDAOProxy();
	}
	public static ILargeClassDAO getILargeClassDAOInstance() {
		return new LargeClassDAOProxy();
	}
	public static ISubClassDAO getISubClassDAOInstance() {
		return new SubClassDAOProxy();
	}
	public static IArticleDAO getIArticleDAOInstance() {
		return new ArticleDAOProxy();
	}
	public static IRoleDAO getIRoleDAOInstance() {
		return new RoleDAOProxy();
	}
	public static IRolePermissionDAO getIRolePermissionDAOInstance() {
		return new RolePermissionDAOProxy();
	}
}

4 关健代码分析
4.1添加文章流程代码分析


                              Request       Response


article_create.jsp 提交请求
table>
		<html:form action="/back/article/article.do" method="post">
			<tr>标题:<html:text property="article.title" /><br><br></tr>
			<tr>
				<html:select property="article.sid">
				<logic:present name="subList" scope="request">
					<html:option value="0.0">请选择分类</html:option>
					<logic:iterate id="sl" name="subList" scope="request">
						<html:option value="${sl.sid}">${sl.subtitle}</html:option>
					</logic:iterate>
				</logic:present>
				</html:select>
			</tr>
			<br>
			<textarea class="ckeditor" cols="80" id="editor1" name="article.content" rows="10"></textarea>
			<br>
			<html:hidden property="status" value="create"/>
			<tr><input type="submit" value="发布" onSubmit="setValue();"/><html:reset value="重置"/></tr>
		</html:form>
		</table>

B.	ArticleAction 类接收、处理请求，并调用DAO层
public ActionForward create(ActionMapping mapping, ActionForm form,
			HttpServletRequest request, HttpServletResponse response) {
		ArticleForm articleForm = (ArticleForm) form;
		IArticleDAO dao = DAOFactory.getIArticleDAOInstance();
		ISubClassDAO sdao = DAOFactory.getISubClassDAOInstance();
		boolean flag = false;
		StringBuffer url = new StringBuffer();
		Article article = null;
		List<SubClass> subList = null;
		article = articleForm.getArticle();
		article.setCreatetime(new Date()); // 设置文章创建日期
		article.setLastedittime(new Date()); // 设置最后访问日期
		article.setVisitcount(1.0); // 设置初始访问量
		article.setLocked(false);
		Double sid = article.getSid();
		// 临时
		article.setId(1.0);
		if ("".equals(sid) || sid == 0 || sid == null) { // 如果没有选择一个分类 ,
			// 就反回继续编辑
			try {
				subList = sdao.findAll("");
			} catch (Exception e) {
				e.printStackTrace();
			}
			request.setAttribute("subList", subList);
			request.setAttribute("msg", "请选择分类 !");
			return mapping.findForward("update");
		}
		try {
			flag = dao.doCreate(article);
			subList = sdao.findAll("");
		} catch (Exception e) {
			e.printStackTrace();
		}
		if (flag) { // 添加成功
			request.setAttribute("msg", "添加成功 !");
			try {
				url.append("/back/article/article.do?status=show&aid=").append(
						dao.findRecentlyArticle(article.getId()).getAid());
			} catch (Exception e) {
				e.printStackTrace();
			}
			request.setAttribute("url", url);
			return mapping.findForward("forward");
		} else { // 添加失败
			request.setAttribute("msg", "添加失败 !");
			request.setAttribute("subList", subList);
			return mapping.findForward("create");
		}
	}

5 总结
由于时间仓促仍有许多没有完成的模块， 需求分析也不够全面。 如有可能将在以后完善 。


开始

登录密码框

判断输入密码是否正确输入？

论坛主页面

进入论坛子模块

点击发帖按钮

编辑帖子并发布

退出


呈现层

提交文章发布请求


控制层

ArticleAction跟据status的值调用相应的方法处理

ArticleForm接收请求内容


持久层


DAO层
