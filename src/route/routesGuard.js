/* eslint-disable react/prop-types */
import useAuthority from "hooks/useAuthority";

const RoutesGuard = (props) => {
  const { userAuthority = [], authority = [], children } = props;

  const roleMatched = useAuthority(userAuthority, authority);

  return <>{roleMatched ? children : null}</>;
};

export default RoutesGuard;
